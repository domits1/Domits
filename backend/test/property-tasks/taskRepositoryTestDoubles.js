const mockGetTaskById = jest.fn();
const mockSaveTaskToDb = jest.fn();
const mockUpdateTaskInDb = jest.fn();
const mockUpdateTaskUnlessCompleted = jest.fn();
const mockSaveActivityToDb = jest.fn();
const mockGetTeamMemberById = jest.fn();
const mockGetChecklistItemsForTask = jest.fn();

const resetTaskRepositoryMocks = () => {
    jest.clearAllMocks();
    mockSaveTaskToDb.mockImplementation(async (dataSource, record) => ({ id: "task-1", ...record }));
    mockUpdateTaskInDb.mockResolvedValue();
    mockUpdateTaskUnlessCompleted.mockResolvedValue(true);
    mockSaveActivityToDb.mockResolvedValue();
    mockGetChecklistItemsForTask.mockResolvedValue([]);
};

const databaseMock = {
    __esModule: true,
    default: { getInstance: jest.fn(async () => ({})) },
};

const taskRepositoryMock = {
    getTaskById: (...args) => mockGetTaskById(...args),
    saveTaskToDb: (...args) => mockSaveTaskToDb(...args),
    updateTaskInDb: (...args) => mockUpdateTaskInDb(...args),
    updateTaskUnlessCompleted: (...args) => mockUpdateTaskUnlessCompleted(...args),
    saveActivityToDb: (...args) => mockSaveActivityToDb(...args),
    getTeamMemberById: (...args) => mockGetTeamMemberById(...args),
    getChecklistItemsForTask: (...args) => mockGetChecklistItemsForTask(...args),
};

module.exports = {
    mockGetTaskById,
    mockSaveTaskToDb,
    mockUpdateTaskInDb,
    mockUpdateTaskUnlessCompleted,
    mockSaveActivityToDb,
    mockGetTeamMemberById,
    mockGetChecklistItemsForTask,
    resetTaskRepositoryMocks,
    databaseMock,
    taskRepositoryMock,
};
