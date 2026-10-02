const mockGetTaskById = jest.fn();
const mockSaveTaskToDb = jest.fn();
const mockUpdateTaskInDb = jest.fn();
const mockSaveActivityToDb = jest.fn();
const mockGetTeamMemberById = jest.fn();

const resetTaskRepositoryMocks = () => {
    jest.clearAllMocks();
    mockSaveTaskToDb.mockImplementation(async (dataSource, record) => ({ id: "task-1", ...record }));
    mockUpdateTaskInDb.mockResolvedValue();
    mockSaveActivityToDb.mockResolvedValue();
};

const databaseMock = {
    __esModule: true,
    default: { getInstance: jest.fn(async () => ({})) },
};

const taskRepositoryMock = {
    getTaskById: (...args) => mockGetTaskById(...args),
    saveTaskToDb: (...args) => mockSaveTaskToDb(...args),
    updateTaskInDb: (...args) => mockUpdateTaskInDb(...args),
    saveActivityToDb: (...args) => mockSaveActivityToDb(...args),
    getTeamMemberById: (...args) => mockGetTeamMemberById(...args),
};

module.exports = {
    mockGetTaskById,
    mockSaveTaskToDb,
    mockUpdateTaskInDb,
    mockSaveActivityToDb,
    mockGetTeamMemberById,
    resetTaskRepositoryMocks,
    databaseMock,
    taskRepositoryMock,
};
