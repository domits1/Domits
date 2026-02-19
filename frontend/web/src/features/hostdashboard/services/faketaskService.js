let mockTasks = [
    { id: 1, title: 'Deep Cleaning', property: 'Villa Sunny', assignee: 'Maria K.', priority: 'High', status: 'OPEN', dueDate: '2024-04-12' },
    { id: 2, title: 'Fix AC', property: 'Loft 4B', assignee: 'Mike Tech', priority: 'Critical', status: 'IN_PROGRESS', dueDate: '2024-04-10' },
];

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const fetchTasks = async () => {
    await delay(600); 
    return [...mockTasks];
};

export const createTask = async (taskData) => {
    await delay(600);
    const newTask = {
        id: Math.floor(Math.random() * 10000),
        createdAt: new Date().toISOString(),
        ...taskData
    };
    mockTasks = [newTask, ...mockTasks];
    return newTask;
};

export const updateTaskStatus = async (id, status) => {
    await delay(300);
    const index = mockTasks.findIndex(t => t.id === id);
    if (index !== -1) {
        mockTasks[index].status = status;
        return mockTasks[index];
    }
    throw new Error("Task not found");
};

export const deleteTask = async (id) => {
    await delay(300);
    mockTasks = mockTasks.filter(t => t.id !== id);
    return id;
};