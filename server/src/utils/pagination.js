
function getPagination(query = {}) {
  const page = Math.max(
    1,
    Number.parseInt(query.page, 10) || 1
  );

  const limit = Math.min(
    100,
    Math.max(1, Number.parseInt(query.limit, 10) || 10)
  );

  return {
    page,
    limit,
    offset: (page - 1) * limit,
  };
}

function getPaginationMeta(total, page, limit) {
  const totalItems = Math.max(0, Number(total) || 0);
  const totalPages = Math.ceil(totalItems / limit);

  return {
    total: totalItems,
    page,
    limit,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1 && totalPages > 0,
  };
}

module.exports = {
  getPagination,
  getPaginationMeta,
};

