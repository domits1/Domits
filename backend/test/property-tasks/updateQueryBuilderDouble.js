// A data source whose update query builder records every call and reports `affected` rows. Shared by
// the tests of repository functions that run UPDATE ... WHERE, where the WHERE is what makes them safe.
const buildUpdateDataSource = (affected) => {
    const chain = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected }),
    };
    return { chain, dataSource: { getRepository: jest.fn(() => ({ createQueryBuilder: jest.fn(() => chain) })) } };
};

module.exports = { buildUpdateDataSource };
