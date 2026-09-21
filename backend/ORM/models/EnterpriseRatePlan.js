const { Model, DataTypes } = require('sequelize');

class EnterpriseRatePlan extends Model {
  static init(sequelize) {
    return super.init({
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      enterprise_id: { type: DataTypes.STRING, allowNull: false },
      price_per_property: { type: DataTypes.DECIMAL(10, 2), defaultValue: 49.00 },
      currency: { type: DataTypes.STRING(3), defaultValue: 'USD' },
      billing_frequency: { type: DataTypes.STRING, defaultValue: 'monthly' },
      status: { type: DataTypes.STRING, defaultValue: 'active' },
      effective_from: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
      effective_until: { type: DataTypes.DATE, allowNull: true }
    }, { sequelize, tableName: 'enterprise_rate_plans' });
  }
}

module.exports = EnterpriseRatePlan;