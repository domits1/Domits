const mockGetTaskById = jest.fn();
const mockSaveTaskToDb = jest.fn();
const mockUpdateTaskInDb = jest.fn();
const mockUpdateTaskUnlessCompleted = jest.fn();
const mockSaveActivityToDb = jest.fn();
const mockGetTeamMemberById = jest.fn();
const mockGetChecklistItemsForTask = jest.fn();
const mockApproveCompletedTaskInDb = jest.fn();
const mockRejectCompletedTaskInDb = jest.fn();

const resetTaskRepositoryMocks = () => {
    jest.clearAllMocks();
    mockSaveTaskToDb.mockImplementation(async (dataSource, record) => ({ id: "task-1", ...record }));
    mockUpdateTaskInDb.mockResolvedValue();
    mockUpdateTaskUnlessCompleted.mockResolvedValue(true);
    mockSaveActivityToDb.mockResolvedValue();
    mockGetChecklistItemsForTask.mockResolvedValue([]);
    mockApproveCompletedTaskInDb.mockResolvedValue(true);
    mockRejectCompletedTaskInDb.mockResolvedValue(true);
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
    approveCompletedTaskInDb: (...args) => mockApproveCompletedTaskInDb(...args),
    rejectCompletedTaskInDb: (...args) => mockRejectCompletedTaskInDb(...args),
};

module.exports = {
    mockGetTaskById,
    mockSaveTaskToDb,
    mockUpdateTaskInDb,
    mockUpdateTaskUnlessCompleted,
    mockSaveActivityToDb,
    mockGetTeamMemberById,
    mockGetChecklistItemsForTask,
    mockApproveCompletedTaskInDb,
    mockRejectCompletedTaskInDb,
    resetTaskRepositoryMocks,
    databaseMock,
    taskRepositoryMock,
};
