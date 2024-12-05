import React from "react";

function FeatureTable({ features }) {
  return (
    <table className="features-table">
      <tbody>
        {Object.entries(features).map(([category, items]) =>
          items.length > 0 ? (
            <React.Fragment key={category}>
              <tr>
                <th colSpan={2}>{category}</th>
              </tr>
              {items.map((item, index) => (
                <tr key={`${category}-${index}`}>
                  <td>{item}</td>
                  <td>Yes</td>
                </tr>
              ))}
            </React.Fragment>
          ) : null
        )}
      </tbody>
    </table>
  );
}

export default FeatureTable;
