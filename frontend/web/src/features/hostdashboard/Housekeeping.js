import React, { useState } from 'react';
import './Housekeeping.css';

const HostPropertyCare = () => {
    // 1. MOCK DATA - Initial tasks so the list isn't empty
    const [tasks, setTasks] = useState([
        { id: 1, title: 'Deep Cleaning', property: 'Villa Sunny', assignee: 'Maria K.', priority: 'High', status: 'To Do' },
        { id: 2, title: 'Fix leaking sink', property: 'Beach House', assignee: 'John D.', priority: 'Medium', status: 'In Progress' },
        { id: 3, title: 'Garden maintenance', property: 'Villa Sunny', assignee: 'GreenTeam', priority: 'Low', status: 'Done' }
    ]);

    // State for the form visibility and inputs
    const [isFormVisible, setIsFormVisible] = useState(false);
    const [newTask, setNewTask] = useState({
        title: '',
        property: '',
        assignee: '',
        priority: 'Medium'
    });

    // 2. FUNCTION: Add a new task
    const handleAddTask = (e) => {
        e.preventDefault();
        if (!newTask.title || !newTask.property) return;

        const taskToAdd = {
            id: Date.now(), // Simple unique ID generation
            ...newTask,
            status: 'To Do'
        };

        setTasks([...tasks, taskToAdd]);
        setNewTask({ title: '', property: '', assignee: '', priority: 'Medium' }); // Reset form
        setIsFormVisible(false); // Hide form
    };

    // 3. FUNCTION: Delete a task
    const handleDelete = (id) => {
        setTasks(tasks.filter(task => task.id !== id));
    };

    // 4. FUNCTION: Change task status (Cycle: To Do -> In Progress -> Done)
    const handleStatusChange = (id, currentStatus) => {
        let nextStatus;
        if (currentStatus === 'To Do') nextStatus = 'In Progress';
        else if (currentStatus === 'In Progress') nextStatus = 'Done';
        else nextStatus = 'To Do';

        setTasks(tasks.map(task => 
            task.id === id ? { ...task, status: nextStatus } : task
        ));
    };

    // Helper for input changes
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setNewTask(prev => ({ ...prev, [name]: value }));
    };

    return (
        <main className="page-body">
            <div className="tasks-header">
                <h2>Task Management</h2>
                <button 
                    className="btn-add-task" 
                    onClick={() => setIsFormVisible(!isFormVisible)}
                >
                    {isFormVisible ? 'Cancel' : '+ Add New Task'}
                </button>
            </div>

            {/* ADD TASK FORM */}
            {isFormVisible && (
                <div className="task-form-container">
                    <form onSubmit={handleAddTask} className="task-form">
                        <input 
                            type="text" 
                            name="title" 
                            placeholder="Task Title (e.g. Clean Room 4)" 
                            value={newTask.title} 
                            onChange={handleInputChange} 
                            required 
                        />
                        <input 
                            type="text" 
                            name="property" 
                            placeholder="Property Name" 
                            value={newTask.property} 
                            onChange={handleInputChange} 
                            required 
                        />
                        <input 
                            type="text" 
                            name="assignee" 
                            placeholder="Assignee (Name)" 
                            value={newTask.assignee} 
                            onChange={handleInputChange} 
                        />
                        <select name="priority" value={newTask.priority} onChange={handleInputChange}>
                            <option value="Low">Low Priority</option>
                            <option value="Medium">Medium Priority</option>
                            <option value="High">High Priority</option>
                        </select>
                        <button type="submit" className="btn-save">Save Task</button>
                    </form>
                </div>
            )}

            {/* TASKS LIST */}
            <div className="tasks-list-container">
                <table className="tasks-table">
                    <thead>
                        <tr>
                            <th>Status</th>
                            <th>Task</th>
                            <th>Property</th>
                            <th>Assignee</th>
                            <th>Priority</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {tasks.length > 0 ? (
                            tasks.map(task => (
                                <tr key={task.id}>
                                    <td>
                                        <span 
                                            className={`status-badge status-${task.status.toLowerCase().replace(' ', '-')}`}
                                            onClick={() => handleStatusChange(task.id, task.status)}
                                            title="Click to change status"
                                        >
                                            {task.status}
                                        </span>
                                    </td>
                                    <td><strong>{task.title}</strong></td>
                                    <td>{task.property}</td>
                                    <td>{task.assignee || 'Unassigned'}</td>
                                    <td>
                                        <span className={`priority-text priority-${task.priority.toLowerCase()}`}>
                                            {task.priority}
                                        </span>
                                    </td>
                                    <td>
                                        <button 
                                            className="btn-delete"
                                            onClick={() => handleDelete(task.id)}
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="6" style={{textAlign: 'center', padding: '20px'}}>
                                    No tasks yet. Click "Add New Task" to create one.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </main>
    );
}

export default HostPropertyCare;