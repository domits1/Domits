const getOffsetDate = (days) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
};

let mockTasks = [
    { id: 1, title: 'Clean after guest checkout', property: 'City Loft Breda', type: 'Cleaning', assignee: 'Sophie Janssen', priority: 'High', status: 'Pending', dueDate: getOffsetDate(0) },
    
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
                id: Date.now(),
                priority: 'Medium', 
                dueDate: new Date().toISOString().split('T')[0],
                ...taskData
            };
            mockTasks = [newTask, ...mockTasks];
            resolve(newTask);
        }, 500);
    });
};

export const deleteTask = async (taskId) => {
    return new Promise((resolve) => {
        setTimeout(() => {
            mockTasks = mockTasks.map(task => 
                task.id === taskId ? { ...task, isLegacy: true } : task
            );
            resolve(taskId);
        }, 300); 
    });
};