const getOffsetDate = (days) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
};

let mockTasks = [
    { id: 1, title: 'Clean after guest checkout', property: 'City Loft Breda', type: 'Cleaning', assignee: 'Sophie Janssen', priority: 'High', status: 'Pending', dueDate: getOffsetDate(0) },
    { id: 2, title: 'Fix leaking faucet', property: 'Beach House', type: 'Maintenance', assignee: 'Jan de Vries', priority: 'Urgent', status: 'In progress', dueDate: getOffsetDate(-2) },
    { id: 3, title: 'Restock toiletries', property: 'City Loft Breda', type: 'Cleaning', assignee: 'Lisa Meijer', priority: 'Low', status: 'Pending', dueDate: getOffsetDate(3) },
    { id: 4, title: 'Inspect smoke detectors', property: 'Beach House', type: 'Inspection', assignee: 'Jan de Vries', priority: 'Medium', status: 'Pending', dueDate: getOffsetDate(7) },
    { id: 5, title: 'Deep clean carpets', property: 'City Loft Breda', type: 'Cleaning', assignee: 'Sophie Janssen', priority: 'Medium', status: 'Completed', dueDate: getOffsetDate(-1) },
    { id: 6, title: 'Replace broken window handle', property: 'City Loft Breda', type: 'Maintenance', assignee: 'Jan de Vries', priority: 'High', status: 'Pending', dueDate: getOffsetDate(0) },
    { id: 7, title: 'Check WiFi router', property: 'Beach House', type: 'Inspection', assignee: 'Sophie Janssen', priority: 'Low', status: 'In progress', dueDate: getOffsetDate(1) },
    { id: 8, title: 'Welcome gift setup', property: 'City Loft Breda', type: 'Cleaning', assignee: 'Lisa Meijer', priority: 'Medium', status: 'Pending', dueDate: getOffsetDate(0) }, 
    { id: 9, title: 'Repair patio chairs', property: 'Beach House', type: 'Maintenance', assignee: 'Jan de Vries', priority: 'Low', status: 'Overdue', dueDate: getOffsetDate(-5) }, 
    { id: 10, title: 'Wash bed linens', property: 'Beach House', type: 'Cleaning', assignee: 'Lisa Meijer', priority: 'High', status: 'Pending', dueDate: getOffsetDate(2) },
    { id: 11, title: 'Monthly property inspection', property: 'City Loft Breda', type: 'Inspection', assignee: 'Sophie Janssen', priority: 'Medium', status: 'Pending', dueDate: getOffsetDate(14) },
    { id: 12, title: 'Fix smart lock battery', property: 'Beach House', type: 'Maintenance', assignee: 'Jan de Vries', priority: 'Urgent', status: 'Pending', dueDate: getOffsetDate(0) }, 
    { id: 13, title: 'Clean windows', property: 'City Loft Breda', type: 'Cleaning', assignee: 'Lisa Meijer', priority: 'Low', status: 'Completed', dueDate: getOffsetDate(-3) },
    { id: 14, title: 'Update guest manual', property: 'Beach House', type: 'Inspection', assignee: 'Sophie Janssen', priority: 'Medium', status: 'Pending', dueDate: getOffsetDate(5) },
    { id: 15, title: 'Check HVAC filters', property: 'City Loft Breda', type: 'Maintenance', assignee: 'Jan de Vries', priority: 'Medium', status: 'Pending', dueDate: getOffsetDate(3) },
    { id: 16, title: 'Sanitize kitchen surfaces', property: 'Beach House', type: 'Cleaning', assignee: 'Sophie Janssen', priority: 'High', status: 'Pending', dueDate: getOffsetDate(0) },
    { id: 17, title: 'Paint scratched wall', property: 'City Loft Breda', type: 'Maintenance', assignee: 'Jan de Vries', priority: 'Low', status: 'Pending', dueDate: getOffsetDate(10) },
    { id: 18, title: 'Inventory check', property: 'Beach House', type: 'Inspection', assignee: 'Lisa Meijer', priority: 'Medium', status: 'Pending', dueDate: getOffsetDate(-1) }, 
    { id: 19, title: 'Plumbing checkup', property: 'City Loft Breda', type: 'Maintenance', assignee: 'Jan de Vries', priority: 'Urgent', status: 'In progress', dueDate: getOffsetDate(-4) }, 
    { id: 20, title: 'Replace lightbulbs', property: 'Beach House', type: 'Maintenance', assignee: 'Sophie Janssen', priority: 'Low', status: 'Completed', dueDate: getOffsetDate(-10) },
    { id: 21, title: 'Clean pool area', property: 'Beach House', type: 'Cleaning', assignee: 'Lisa Meijer', priority: 'High', status: 'Pending', dueDate: getOffsetDate(1) },
    { id: 22, title: 'Fire extinguisher check', property: 'City Loft Breda', type: 'Inspection', assignee: 'Jan de Vries', priority: 'High', status: 'Pending', dueDate: getOffsetDate(6) },
    { id: 23, title: 'Organize cleaning supplies', property: 'City Loft Breda', type: 'Cleaning', assignee: 'Sophie Janssen', priority: 'Low', status: 'Pending', dueDate: getOffsetDate(0) },
    { id: 24, title: 'Unclog shower drain', property: 'Beach House', type: 'Maintenance', assignee: 'Jan de Vries', priority: 'Urgent', status: 'Pending', dueDate: getOffsetDate(0) },
    { id: 25, title: 'Empty trash bins', property: 'City Loft Breda', type: 'Cleaning', assignee: 'Lisa Meijer', priority: 'Medium', status: 'Pending', dueDate: getOffsetDate(0) },
    { id: 26, title: 'Check roof tiles', property: 'Beach House', type: 'Inspection', assignee: 'Sophie Janssen', priority: 'Low', status: 'Pending', dueDate: getOffsetDate(20) },
    { id: 27, title: 'Mow the lawn', property: 'Beach House', type: 'Maintenance', assignee: 'Jan de Vries', priority: 'Medium', status: 'Pending', dueDate: getOffsetDate(2) },
    { id: 28, title: 'Dust all blinds', property: 'City Loft Breda', type: 'Cleaning', assignee: 'Lisa Meijer', priority: 'Low', status: 'Pending', dueDate: getOffsetDate(4) },
    { id: 29, title: 'Review security cameras', property: 'City Loft Breda', type: 'Inspection', assignee: 'Jan de Vries', priority: 'High', status: 'In progress', dueDate: getOffsetDate(0) },
    { id: 30, title: 'Clean oven and microwave', property: 'Beach House', type: 'Cleaning', assignee: 'Sophie Janssen', priority: 'Medium', status: 'Pending', dueDate: getOffsetDate(1) },
    { id: 31, title: 'Fix broken deck board', property: 'Beach House', type: 'Maintenance', assignee: 'Jan de Vries', priority: 'High', status: 'Pending', dueDate: getOffsetDate(-3) }, 
    { id: 32, title: 'Sweep front porch', property: 'City Loft Breda', type: 'Cleaning', assignee: 'Lisa Meijer', priority: 'Low', status: 'Pending', dueDate: getOffsetDate(0) },
    { id: 33, title: 'Check thermostat', property: 'City Loft Breda', type: 'Inspection', assignee: 'Sophie Janssen', priority: 'Medium', status: 'Completed', dueDate: getOffsetDate(-2) },
    { id: 34, title: 'Lubricate door hinges', property: 'Beach House', type: 'Maintenance', assignee: 'Jan de Vries', priority: 'Low', status: 'Pending', dueDate: getOffsetDate(8) },
    { id: 35, title: 'Prepare welcome basket', property: 'City Loft Breda', type: 'Cleaning', assignee: 'Sophie Janssen', priority: 'High', status: 'Pending', dueDate: getOffsetDate(1) }
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