const getOffsetDate = (days) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
};

let mockTasks = [
    { id: 1, title: 'Clean after guest checkout', property: 'City Loft Breda', type: 'Cleaning', assignee: 'Sophie Janssen', priority: 'High', status: 'Pending', dueDate: getOffsetDate(0) }, // Today
    { id: 2, title: 'Fix leaking faucet', property: 'Beach House', type: 'Maintenance', assignee: 'Jan de Vries', priority: 'Urgent', status: 'In progress', dueDate: getOffsetDate(-2) }, // Overdue
    { id: 3, title: 'Restock toiletries', property: 'City Loft Breda', type: 'Cleaning', assignee: 'Lisa Meijer', priority: 'Low', status: 'Pending', dueDate: getOffsetDate(3) }, // Upcoming
    { id: 4, title: 'Inspect smoke detectors', property: 'Beach House', type: 'Inspection', assignee: 'Jan de Vries', priority: 'Medium', status: 'Pending', dueDate: getOffsetDate(7) },
    { id: 5, title: 'Deep clean carpets', property: 'City Loft Breda', type: 'Cleaning', assignee: 'Sophie Janssen', priority: 'Medium', status: 'Completed', dueDate: getOffsetDate(-1) },
    { id: 6, title: 'Replace broken window handle', property: 'City Loft Breda', type: 'Maintenance', assignee: 'Jan de Vries', priority: 'High', status: 'Pending', dueDate: getOffsetDate(0) }, // Today
    { id: 7, title: 'Check WiFi router', property: 'Beach House', type: 'Inspection', assignee: 'Sophie Janssen', priority: 'Low', status: 'In progress', dueDate: getOffsetDate(1) },
    { id: 8, title: 'Welcome gift setup', property: 'City Loft Breda', type: 'Cleaning', assignee: 'Lisa Meijer', priority: 'Medium', status: 'Pending', dueDate: getOffsetDate(0) }, // Today
    { id: 9, title: 'Repair patio chairs', property: 'Beach House', type: 'Maintenance', assignee: 'Jan de Vries', priority: 'Low', status: 'Overdue', dueDate: getOffsetDate(-5) }, // Overdue
    { id: 10, title: 'Wash bed linens', property: 'Beach House', type: 'Cleaning', assignee: 'Lisa Meijer', priority: 'High', status: 'Pending', dueDate: getOffsetDate(2) },
    { id: 11, title: 'Monthly property inspection', property: 'City Loft Breda', type: 'Inspection', assignee: 'Sophie Janssen', priority: 'Medium', status: 'Pending', dueDate: getOffsetDate(14) },
    { id: 12, title: 'Fix smart lock battery', property: 'Beach House', type: 'Maintenance', assignee: 'Jan de Vries', priority: 'Urgent', status: 'Pending', dueDate: getOffsetDate(0) }, // Today
    { id: 13, title: 'Clean windows', property: 'City Loft Breda', type: 'Cleaning', assignee: 'Lisa Meijer', priority: 'Low', status: 'Completed', dueDate: getOffsetDate(-3) },
    { id: 14, title: 'Update guest manual', property: 'Beach House', type: 'Inspection', assignee: 'Sophie Janssen', priority: 'Medium', status: 'Pending', dueDate: getOffsetDate(5) },
    { id: 15, title: 'Check HVAC filters', property: 'City Loft Breda', type: 'Maintenance', assignee: 'Jan de Vries', priority: 'Medium', status: 'Pending', dueDate: getOffsetDate(3) }
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