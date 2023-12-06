import React from "react";
const MList = ({ list }) => {
    return (
        <div className="manage-list">
            {list.map(item => (
                <div className="item-preview" key={item.id}>
                    <h2>{item.title}</h2>
                </div>
            ))}
        </div>
    );
}
export default MList;
