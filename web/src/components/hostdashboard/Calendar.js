import React, {useEffect, useState} from 'react';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';
import { DateRangePicker } from 'react-date-range';
import { addDays, addWeeks, addMonths } from 'date-fns';

function Calendar({passedProp}) {
  const [dateRange, setDateRange] = useState([
    {
      startDate: new Date(),
      endDate: addDays(new Date(), 7),
      key: 'selection'
    }
  ]);

    useEffect(() => {
        if (passedProp) {
            console.log(passedProp);
        }
    }, []);
  // Custom rendering for the static range labels
  const renderStaticRangeLabel = () => {
    return (
      <div>
        <button onClick={() => handleStaticRangeClick('nextWeek')}>Next Week</button>
        <button onClick={() => handleStaticRangeClick('nextMonth')}>Next Month</button>
      </div>
    );
  };

  const handleSubmit = () => {
    console.log('Selected Dates:', dateRange);
    // further processing logic goes here, such as sending data to a backend server
  };

  // Function to handle clicks on custom static range labels
  const handleStaticRangeClick = (rangeType) => {
    let startDate, endDate;

    if (rangeType === 'nextWeek') {
      startDate = new Date();
      endDate = addWeeks(startDate, 1);
    } else if (rangeType === 'nextMonth') {
      startDate = new Date();
      endDate = addMonths(startDate, 1);
    }

    setDateRange([{ startDate, endDate, key: 'selection' }]);
  };

  return (
    <div>
      <DateRangePicker
        onChange={item => setDateRange([item.selection])}
        showSelectionPreview={true}
        moveRangeOnFirstSelection={false}
        months={2}
        ranges={dateRange}
        direction="horizontal"
        minDate={new Date()}
        maxDate={addDays(new Date(), 365)}
        renderStaticRangeLabel={renderStaticRangeLabel}
        staticRanges={[
          {
            label: 'Today',
            range: () => ({ startDate: new Date(), endDate: new Date() }),
            isSelected: () => false // Add isSelected function to prevent error
          },
          {
            label: 'This Week',
            range: () => ({ startDate: new Date(), endDate: addWeeks(new Date(), 1) }),
            isSelected: () => false // Add isSelected function to prevent error
          },
          {
            label: 'Next Week',
            range: () => ({ startDate: addWeeks(new Date(), 1), endDate: addWeeks(new Date(), 2) }),
            isSelected: () => false // Add isSelected function to prevent error
          },
          {
            label: 'This Month',
            range: () => ({ startDate: new Date(), endDate: addMonths(new Date(), 1) }),
            isSelected: () => false // Add isSelected function to prevent error
          },
          {
            label: 'Next Month',
            range: () => ({ startDate: addMonths(new Date(), 1), endDate: addMonths(new Date(), 2) }),
            isSelected: () => false // Add isSelected function to prevent error
          }
        ]}
      />
      <button onClick={handleSubmit}>Submit</button>
    </div>
  );
}

export default Calendar;
