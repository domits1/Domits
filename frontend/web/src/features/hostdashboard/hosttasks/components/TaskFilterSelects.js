import React from 'react';
import PropTypes from 'prop-types';

const TaskFilterSelects = ({ filters, filterPropertyOptions, onFilterChange }) => (
    <>
        <select name="property" value={filters.property} onChange={onFilterChange}>
            <option value="All properties">All properties</option>
            {filterPropertyOptions.map(label => (
                <option key={label} value={label}>{label}</option>
            ))}
        </select>

        <select name="status" value={filters.status} onChange={onFilterChange}>
            <option value="All statuses">All statuses</option>
            <option value="Pending">Pending</option>
            <option value="In progress">In progress</option>
            <option value="Completed">Completed</option>
            <option value="Overdue">Overdue</option>
        </select>
    </>
);

TaskFilterSelects.propTypes = {
    filters: PropTypes.shape({
        property: PropTypes.string,
        status: PropTypes.string,
    }).isRequired,
    filterPropertyOptions: PropTypes.arrayOf(PropTypes.string).isRequired,
    onFilterChange: PropTypes.func.isRequired,
};

export default TaskFilterSelects;
