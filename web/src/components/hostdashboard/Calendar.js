import React, {useEffect, useState} from 'react';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';
import { DateRangePicker } from 'react-date-range';
import { addDays, addWeeks, addMonths } from 'date-fns';

function Calendar({passedProp}) {
    const [isLoading, setIsLoading] = useState(true);
    const [dateRange, setDateRange] = useState([
        {
            startDate: null,
            endDate: null,
            key: 'selection'
        }
    ]);

    useEffect(() => {
        const existingStartDate = passedProp.StartDate;
        const existingEndDate = passedProp.EndDate;

        // Check if both startDate and endDate exist
        if (existingStartDate && existingEndDate) {
            // Convert passedProp dates from string to Date objects if necessary
            const newStartDate = new Date(existingStartDate);
            const newEndDate = new Date(existingEndDate);

            // Update the dateRange state to use the new start and end dates
            setDateRange([
                {
                    startDate: newStartDate,
                    endDate: newEndDate,
                    key: 'selection'
                }
            ]);
        } else {
            // If the dates are not set yet, set the date automatically and let the host decide.
            const newStartDate = new Date();
            const newEndDate = new Date().setDate(new Date().getDate() + 7);

            // Update the dateRange state to use the new start and end dates
            setDateRange([
                {
                    startDate: newStartDate,
                    endDate: newEndDate,
                    key: 'selection'
                }
            ]);
        }
    }, [passedProp.ID]);
  // Custom rendering for the static range labels
  const renderStaticRangeLabel = () => {
    return (
      <div>
        <button onClick={() => handleStaticRangeClick('nextWeek')}>Next Week</button>
        <button onClick={() => handleStaticRangeClick('nextMonth')}>Next Month</button>
      </div>
    );
  };

  const asyncSetDate = async () => {
    const body = {
        StartDate: dateRange[0].startDate.toISOString(),
        EndDate: dateRange[0].endDate.toISOString(),
        ID: passedProp.ID
    }
      setIsLoading(true);
      try {
          console.log(body);
          const response = await fetch('https://6jjgpv2gci.execute-api.eu-north-1.amazonaws.com/dev/UpdateAccommodation', {
              method: 'PUT',
              body: JSON.stringify(body),
              headers: {'Content-type': 'application/json; charset=UTF-8',
              }
          });
          if (!response.ok) {
              throw new Error('Failed to fetch');
          } else {
              const data = await response.json(); // Parse JSON response
              const jsonData = JSON.parse(data.body);
              if (jsonData.updatedAttributes) {
                  const updatedAttributes = jsonData.updatedAttributes;
                  passedProp.StartDate = updatedAttributes.StartDate;
                  passedProp.EndDate = updatedAttributes.EndDate;
              } else {
                  console.log("updatedAttributes is missing in the response");
                  // Handle the absence of expected data, e.g., by setting defaults or showing an error message
              }
          }
      } catch (error) {
          // Error Handling
          console.error("Unexpected error:", error);
      } finally {
          setIsLoading(false); // End loading regardless of promise outcome
      }
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
      <button onClick={asyncSetDate}>Submit</button>
    </div>
  );
}

export default Calendar;
