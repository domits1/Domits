// Data sources whose query builders record every call. Shared by the tests of repository functions
// that build their SQL with the query builder, where the conditions are what make them safe.
const buildDataSourceFor = (chain) => ({
    getRepository: jest.fn(() => ({ createQueryBuilder: jest.fn(() => chain) })),
});

// For SELECT: resolves to `tasks`.
const buildSelectDataSource = (tasks) => {
    const chain = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(tasks),
    };
    return { chain, dataSource: buildDataSourceFor(chain) };
};

// For UPDATE ... WHERE: reports `affected` rows.
const buildUpdateDataSource = (affected) => {
    const chain = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected }),
    };
    return { chain, dataSource: buildDataSourceFor(chain) };
};

module.exports = { buildSelectDataSource, buildUpdateDataSource };
