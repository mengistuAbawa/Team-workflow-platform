const assert = require("node:assert/strict");
const { after, before, test } = require("node:test");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../src/config/db");
const taskService = require("../src/services/taskService");

process.env.NODE_ENV = "test";
process.env.ADMIN_INVITE_CODE = "test-admin-invitation-code";
process.env.CLIENT_URL = "https://team-workflow-platform-sslh.vercel.app";
process.env.JWT_SECRET = "test-only-jwt-secret";

const app = require("../src/app");

let server;
let baseUrl;

before(async () => {
  server = app.listen(0, "127.0.0.1");
  await new Promise((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  try {
    if (server) {
      await new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    }
  } finally {
    await pool.end();
  }
});

test("root serves the client application", async () => {
  const response = await fetch(baseUrl);
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.match(html, /<div id="root"><\/div>/);
  assert.match(html, /\/assets\/index-[^"]+\.js/);
});

test("client routes fall back to the application", async () => {
  const response = await fetch(`${baseUrl}/login`);

  assert.equal(response.status, 200);
  assert.match(await response.text(), /<div id="root"><\/div>/);
});

test("allows requests from the deployed frontend origin", async () => {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: "OPTIONS",
    headers: {
      Origin: process.env.CLIENT_URL,
      "Access-Control-Request-Method": "POST",
      "Access-Control-Request-Headers": "content-type",
    },
  });

  assert.equal(response.status, 204);
  assert.equal(
    response.headers.get("access-control-allow-origin"),
    process.env.CLIENT_URL
  );
});

test("unknown API routes retain JSON not-found responses", async () => {
  const response = await fetch(`${baseUrl}/api/not-a-route`);

  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), {
    success: false,
    message: "Route not found: GET /api/not-a-route",
  });
});

test("members self-register while admin signup requires approval", async () => {
  const password = "Password123";
  const pendingAdminHash = await bcrypt.hash(password, 4);
  const originalExecute = pool.execute;
  const insertParameters = [];

  pool.execute = async (sql, values) => {
    if (sql.includes("SELECT id FROM users WHERE email = ?")) {
      return [[], []];
    }

    if (sql.includes("INSERT INTO users")) {
      insertParameters.push(values);
      return [{ insertId: insertParameters.length }, []];
    }

    if (sql.includes("SELECT id, full_name, email, password_hash")) {
      return [
        [
          {
            id: 2,
            full_name: "Pending Admin",
            email: "pending-admin@example.com",
            password_hash: pendingAdminHash,
            avatar: null,
            role: "admin",
            is_active: 0,
            approval_status: "pending",
          },
        ],
        [],
      ];
    }

    throw new Error(`Unexpected database query in test: ${sql}`);
  };

  try {
    const memberResponse = await fetch(`${baseUrl}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: "Team Member",
        email: "member@example.com",
        password,
        role: "member",
      }),
    });
    const memberResult = await memberResponse.json();

    assert.equal(memberResponse.status, 201);
    assert.equal(memberResult.data.user.role, "member");
    assert.equal(typeof memberResult.data.token, "string");
    assert.deepEqual(insertParameters[0].slice(3), [
      "member",
      1,
      "approved",
    ]);

    const invalidAdminResponse = await fetch(`${baseUrl}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: "Admin Applicant",
        email: "admin-applicant@example.com",
        password,
        role: "admin",
        adminInvitationCode: "incorrect-code",
      }),
    });
    assert.equal(invalidAdminResponse.status, 403);

    const adminResponse = await fetch(`${baseUrl}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: "Admin Applicant",
        email: "admin-applicant@example.com",
        password,
        role: "admin",
        adminInvitationCode: process.env.ADMIN_INVITE_CODE,
      }),
    });
    const adminResult = await adminResponse.json();

    assert.equal(adminResponse.status, 201);
    assert.equal(adminResult.data.user.approval_status, "pending");
    assert.equal(adminResult.data.requiresApproval, true);
    assert.equal("token" in adminResult.data, false);
    assert.deepEqual(insertParameters[1].slice(3), [
      "admin",
      0,
      "pending",
    ]);

    const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "pending-admin@example.com",
        password,
      }),
    });
    const loginResult = await loginResponse.json();

    assert.equal(loginResponse.status, 403);
    assert.match(loginResult.message, /awaiting approval/i);
  } finally {
    pool.execute = originalExecute;
  }
});

test("public registration does not allow assigning the manager role", async () => {
  const response = await fetch(`${baseUrl}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fullName: "Unauthorized Manager",
      email: "manager-applicant@example.com",
      password: "Password123",
      role: "manager",
    }),
  });

  assert.equal(response.status, 400);
});

test("admin password resets preserve exact input and reject invalid lengths", async () => {
  const originalExecute = pool.execute;
  const originalGetConnection = pool.getConnection;
  const updatedValues = [];
  let updateCount = 0;
  const token = jwt.sign({ sub: "1" }, process.env.JWT_SECRET);

  pool.execute = async (sql, values) => {
    if (sql.includes("SELECT id, full_name, email, avatar, role, is_active, approval_status")) {
      return [
        [
          {
            id: 1,
            full_name: "Administrator",
            email: "admin@example.com",
            role: "admin",
            is_active: true,
            approval_status: "approved",
          },
        ],
        [],
      ];
    }

    if (sql.includes("SELECT id, email, role, is_active FROM users")) {
      return [
        [
          {
            id: 2,
            email: "manager@example.com",
            role: "manager",
            is_active: true,
          },
        ],
        [],
      ];
    }

    if (sql.includes("SELECT id FROM users WHERE email = ? AND id <> ?")) {
      return [[], []];
    }

    if (sql.startsWith("UPDATE users SET")) {
      updateCount += 1;
      updatedValues.push(values);
      return [{ affectedRows: 1 }, []];
    }

    if (sql.includes("SELECT id, full_name, email, avatar, role, is_active, approval_status, updated_at")) {
      return [
        [
          {
            id: 2,
            full_name: "Project Manager",
            email: "manager@example.com",
            role: "manager",
            is_active: true,
            approval_status: "approved",
          },
        ],
        [],
      ];
    }

    throw new Error(`Unexpected database query in test: ${sql}`);
  };
  pool.getConnection = async () => ({
    beginTransaction: async () => {},
    commit: async () => {},
    rollback: async () => {},
    release: () => {},
    execute: pool.execute,
  });

  try {
    const resetPassword = "  newPass123  ";
    const response = await fetch(`${baseUrl}/api/admin/users/2`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        full_name: "Project Manager",
        email: "manager@example.com",
        role: "manager",
        is_active: true,
        password: resetPassword,
      }),
    });

    assert.equal(response.status, 200);
    const passwordHash = updatedValues[0][4];
    assert.equal(await bcrypt.compare(resetPassword, passwordHash), true);
    assert.equal(await bcrypt.compare(resetPassword.trim(), passwordHash), false);

    const invalidResponse = await fetch(`${baseUrl}/api/admin/users/2`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        full_name: "Project Manager",
        email: "manager@example.com",
        role: "manager",
        is_active: true,
        password: "short",
      }),
    });

    assert.equal(invalidResponse.status, 400);
    assert.equal(updateCount, 1);
  } finally {
    pool.execute = originalExecute;
    pool.getConnection = originalGetConnection;
  }
});

test("admin member creation saves a linked developer profile transactionally", async () => {
  const originalExecute = pool.execute;
  const originalGetConnection = pool.getConnection;
  const token = jwt.sign({ sub: "1" }, process.env.JWT_SECRET);
  const transactionEvents = [];
  const queries = [];

  pool.execute = async (sql) => {
    if (sql.includes("SELECT id, full_name, email, avatar, role, is_active, approval_status")) {
      return [
        [
          {
            id: 1,
            full_name: "Administrator",
            email: "admin@example.com",
            role: "admin",
            is_active: true,
            approval_status: "approved",
          },
        ],
        [],
      ];
    }
    throw new Error(`Unexpected pool query in test: ${sql}`);
  };
  pool.getConnection = async () => ({
    beginTransaction: async () => transactionEvents.push("begin"),
    commit: async () => transactionEvents.push("commit"),
    rollback: async () => transactionEvents.push("rollback"),
    release: () => transactionEvents.push("release"),
    execute: async (sql, values) => {
      queries.push({ sql, values });
      if (sql.includes("INSERT INTO users")) {
        return [{ insertId: "23" }, []];
      }
      if (sql.includes("INSERT INTO developers")) {
        return [{ affectedRows: 1 }, []];
      }
      if (sql.includes("SELECT id, full_name, email, avatar, role, is_active, created_at")) {
        return [
          [
            {
              id: 23,
              full_name: "Ada Lovelace",
              email: "ada@example.com",
              role: "member",
              is_active: true,
            },
          ],
          [],
        ];
      }
      throw new Error(`Unexpected connection query in test: ${sql}`);
    },
  });

  try {
    const response = await fetch(`${baseUrl}/api/admin/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        email: "ada@example.com",
        password: "Password123",
        role: "member",
        developerProfile: {
          firstName: "Ada",
          lastName: "Lovelace",
          phoneNumber: "+1-555-0100",
          jobTitle: "Software Engineer",
          seniorityLevel: "Senior",
          department: "Engineering",
          employmentStatus: "Full-Time",
          baseSalary: "125000.50",
          currency: "USD",
          hireDate: "2024-01-15",
        },
      }),
    });
    const result = await response.json();

    assert.equal(response.status, 201);
    assert.equal(result.data.user.id, 23);
    assert.deepEqual(transactionEvents, ["begin", "commit", "release"]);
    assert.match(queries[1].sql, /ON CONFLICT \(user_id\) DO UPDATE/);
    assert.deepEqual(queries[1].values, [
      "DEV-N",
      "23",
      "Ada",
      "Lovelace",
      "ada@example.com",
      "+1-555-0100",
      "Software Engineer",
      "Senior",
      "Engineering",
      "Full-Time",
      125000.5,
      "USD",
      "2024-01-15",
    ]);

    const invalidResponse = await fetch(`${baseUrl}/api/admin/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        email: "invalid-profile@example.com",
        password: "Password123",
        role: "member",
        developerProfile: {
          firstName: "Ada",
          lastName: "Lovelace",
          jobTitle: "Engineer",
          employmentStatus: "Full-Time",
          baseSalary: "-1",
          currency: "USD",
          hireDate: "2024-01-15",
        },
      }),
    });

    assert.equal(invalidResponse.status, 400);
    assert.deepEqual(transactionEvents, ["begin", "commit", "release"]);
  } finally {
    pool.execute = originalExecute;
    pool.getConnection = originalGetConnection;
  }
});

test("admin member edits update the account and developer profile together", async () => {
  const originalExecute = pool.execute;
  const originalGetConnection = pool.getConnection;
  const token = jwt.sign({ sub: "1" }, process.env.JWT_SECRET);
  const transactionEvents = [];
  const queries = [];

  pool.execute = async (sql) => {
    if (sql.includes("SELECT id, full_name, email, avatar, role, is_active, approval_status")) {
      return [
        [
          {
            id: 1,
            full_name: "Administrator",
            email: "admin@example.com",
            role: "admin",
            is_active: true,
            approval_status: "approved",
          },
        ],
        [],
      ];
    }
    throw new Error(`Unexpected pool query in test: ${sql}`);
  };
  pool.getConnection = async () => ({
    beginTransaction: async () => transactionEvents.push("begin"),
    commit: async () => transactionEvents.push("commit"),
    rollback: async () => transactionEvents.push("rollback"),
    release: () => transactionEvents.push("release"),
    execute: async (sql, values) => {
      queries.push({ sql, values });
      if (sql.includes("SELECT id, email, role, is_active FROM users")) {
        return [
          [{ id: 2, email: "ada@example.com", role: "member", is_active: true }],
          [],
        ];
      }
      if (sql.includes("SELECT id FROM users WHERE email = ? AND id <> ?")) {
        return [[], []];
      }
      if (sql.startsWith("UPDATE users SET")) {
        return [{ affectedRows: 1 }, []];
      }
      if (sql.includes("INSERT INTO developers")) {
        return [{ affectedRows: 1 }, []];
      }
      if (sql.includes("SELECT id, full_name, email, avatar, role, is_active, approval_status, updated_at")) {
        return [
          [
            {
              id: 2,
              full_name: "Ada Byron",
              email: "ada.byron@example.com",
              role: "member",
              is_active: true,
              approval_status: "approved",
            },
          ],
          [],
        ];
      }
      throw new Error(`Unexpected connection query in test: ${sql}`);
    },
  });

  try {
    const response = await fetch(`${baseUrl}/api/admin/users/2`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        email: "ada.byron@example.com",
        role: "member",
        is_active: true,
        developerProfile: {
          firstName: "Ada",
          lastName: "Byron",
          phoneNumber: "",
          jobTitle: "Principal Engineer",
          seniorityLevel: "Principal",
          department: "Engineering",
          employmentStatus: "Full-Time",
          baseSalary: "150000",
          currency: "USD",
          hireDate: "2020-03-10",
        },
      }),
    });
    const result = await response.json();

    assert.equal(response.status, 200);
    assert.equal(result.data.user.full_name, "Ada Byron");
    assert.deepEqual(transactionEvents, ["begin", "commit", "release"]);
    assert.match(queries.find(({ sql }) => sql.startsWith("UPDATE users SET")).sql, /full_name = \?/);
    const profileQuery = queries.find(({ sql }) => sql.includes("INSERT INTO developers"));
    assert.equal(profileQuery.values[4], "ada.byron@example.com");
    assert.equal(profileQuery.values[6], "Principal Engineer");
  } finally {
    pool.execute = originalExecute;
    pool.getConnection = originalGetConnection;
  }
});

test("pending administrator requests appear to admins and can be approved", async () => {
  const originalExecute = pool.execute;
  const pendingRequest = {
    id: 2,
    full_name: "Pending Administrator",
    email: "pending-admin@example.com",
    role: "admin",
    is_active: 0,
    approval_status: "pending",
  };
  const token = jwt.sign({ sub: "1" }, process.env.JWT_SECRET);
  let approvalUpdate;

  pool.execute = async (sql, values) => {
    if (sql.includes("SELECT id, full_name, email, avatar, role, is_active, approval_status")) {
      return [
        [
          {
            id: 1,
            full_name: "Administrator",
            email: "admin@example.com",
            role: "admin",
            is_active: true,
            approval_status: "approved",
          },
        ],
        [],
      ];
    }

    if (sql.includes("FROM users u")) {
      return [[pendingRequest], []];
    }

    if (sql.includes("SELECT id, is_active, full_name, role, approval_status")) {
      return [[pendingRequest], []];
    }

    if (sql.includes("UPDATE users SET is_active = ?, approval_status = 'approved'")) {
      approvalUpdate = { sql, values };
      return [{ affectedRows: 1 }, []];
    }

    throw new Error(`Unexpected database query in test: ${sql}`);
  };

  try {
    const requestResponse = await fetch(`${baseUrl}/api/admin/users?role=admin`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const requestResult = await requestResponse.json();

    assert.equal(requestResponse.status, 200);
    assert.equal(requestResult.data.users[0].approval_status, "pending");

    const approvalResponse = await fetch(`${baseUrl}/api/admin/users/2/status`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
    });
    const approvalResult = await approvalResponse.json();

    assert.equal(approvalResponse.status, 200);
    assert.equal(approvalResult.data.approval_status, "approved");
    assert.match(approvalUpdate.sql, /approval_status = 'approved'/);
    assert.deepEqual(approvalUpdate.values, [1, "2"]);
  } finally {
    pool.execute = originalExecute;
  }
});

test("members cannot create projects or tasks, while managers can reach validation", async () => {
  const originalExecute = pool.execute;
  const memberToken = jwt.sign({ sub: "3" }, process.env.JWT_SECRET);
  const managerToken = jwt.sign({ sub: "2" }, process.env.JWT_SECRET);

  pool.execute = async (sql, values) => {
    if (sql.includes("SELECT id, full_name, email, avatar, role, is_active, approval_status")) {
      const isManager = Number(values[0]) === 2;
      return [
        [
          {
            id: isManager ? 2 : 3,
            full_name: isManager ? "Project Manager" : "Team Member",
            email: isManager ? "manager@example.com" : "member@example.com",
            role: isManager ? "manager" : "member",
            is_active: true,
            approval_status: "approved",
          },
        ],
        [],
      ];
    }

    throw new Error(`Unexpected database query in test: ${sql}`);
  };

  try {
    const memberProjectResponse = await fetch(`${baseUrl}/api/projects`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${memberToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: "Member project" }),
    });
    const memberTaskResponse = await fetch(`${baseUrl}/api/tasks`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${memberToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ project_id: 1, title: "Member task" }),
    });

    assert.equal(memberProjectResponse.status, 403);
    assert.equal(memberTaskResponse.status, 403);

    const managerProjectResponse = await fetch(`${baseUrl}/api/projects`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${managerToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });
    const managerTaskResponse = await fetch(`${baseUrl}/api/tasks`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${managerToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });

    assert.equal(managerProjectResponse.status, 400);
    assert.equal(managerTaskResponse.status, 400);
  } finally {
    pool.execute = originalExecute;
  }
});

test("members cannot access or manage tasks assigned to someone else", async () => {
  const originalExecute = pool.execute;
  const memberToken = jwt.sign({ sub: "3" }, process.env.JWT_SECRET);

  pool.execute = async (sql) => {
    if (sql.includes("SELECT id, full_name, email, avatar, role, is_active, approval_status")) {
      return [
        [
          {
            id: 3,
            full_name: "Team Member",
            email: "member@example.com",
            role: "member",
            is_active: true,
            approval_status: "approved",
          },
        ],
        [],
      ];
    }

    if (sql.includes("FROM tasks WHERE id = ? AND assignee_id = ?")) {
      return [[], []];
    }

    if (sql.includes("SELECT id, project_id FROM tasks WHERE id = ?")) {
      return [[{ id: 9, project_id: 1 }], []];
    }

    if (sql.includes("SELECT id FROM tasks WHERE id = ?")) {
      return [[{ id: 9 }], []];
    }

    throw new Error(`Unexpected database query in test: ${sql}`);
  };

  try {
    const requestHeaders = { Authorization: `Bearer ${memberToken}` };
    const getResponse = await fetch(`${baseUrl}/api/tasks/9`, {
      headers: requestHeaders,
    });
    const updateResponse = await fetch(`${baseUrl}/api/tasks/9`, {
      method: "PUT",
      headers: {
        ...requestHeaders,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ title: "Changed by member" }),
    });
    const deleteResponse = await fetch(`${baseUrl}/api/tasks/9`, {
      method: "DELETE",
      headers: requestHeaders,
    });

    assert.equal(getResponse.status, 403);
    assert.equal(updateResponse.status, 403);
    assert.equal(deleteResponse.status, 403);
  } finally {
    pool.execute = originalExecute;
  }
});

test("member task queries are scoped to assigned tasks", async () => {
  const originalExecute = pool.execute;
  let query;
  let values;

  pool.execute = async (statement, parameters) => {
    query = statement;
    values = parameters;
    return [[], []];
  };

  try {
    await taskService.findForUser(3, {}, "member");

    assert.match(query, /WHERE t\.assignee_id = \?/);
    assert.deepEqual(values, [3, 3]);
  } finally {
    pool.execute = originalExecute;
  }
});
