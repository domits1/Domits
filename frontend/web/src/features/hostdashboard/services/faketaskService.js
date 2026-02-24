let mockTasks = [
    { id: 1, title: 'Clean after guest checkout', property: 'City Loft Breda', type: 'Cleaning', assignee: 'Sophie Janssen', priority: 'High', status: 'Pending', dueDate: '2023-11-01' },
];

export const fetchTasks = async () => {
    return new Promise((resolve) => {
        setTimeout(() => resolve([...mockTasks]), 500);
    });
};

export const createTask = async (taskData) => {
    return new Promise((resolve) => {
        setTimeout(() => {
            const newTask = {
                id: Math.floor(Math.random() * 10000),
                ...taskData,
                priority: 'Medium', 
                dueDate: new Date().toISOString().split('T')[0]
            };
            mockTasks = [newTask, ...mockTasks];
            resolve(newTask);
        }, 500);
    });
};