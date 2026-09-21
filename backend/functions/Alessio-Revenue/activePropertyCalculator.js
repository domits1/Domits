const { Property } = require('../../ORM/models/Property.js');

async function getActivePropertyCount(enterpriseId) {
  return await Property.count({
    where: {
      enterprise_id: enterpriseId,
      status: 'active',
      is_deleted: false
    }
  });
}

module.exports = { getActivePropertyCount };