import React, {useEffect, useState} from 'react';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';
import { DateRangePicker } from 'react-date-range';
import { addDays, addWeeks, addMonths } from 'date-fns';
import returner from "../../images/icons/return-icon.png";

/**
 * @author Chahid Laauoar & Jiaming Yan
 * @param passedProp =
 * @returns {Element}
 * @constructor
 */
function Calendar({passedProp, isNew, updateDates}) {
    const [isLoading, setIsLoading] = useState(true);
    const [dateRange, setDateRange] = useState([{
        startDate: new Date(),
        endDate: addDays(new Date(), 7),
        key: 'selection'
    }]);
    const [oldDateRange, setOldDateRange] = useState([...dateRange]);

    const resetDates = () => {
        setDateRange([...oldDateRange]);
    };
    useEffect(() => {
        if (passedProp && passedProp.StartDate && passedProp.EndDate) {
            const newDateRange = [{
                startDate: new Date(passedProp.StartDate),
                endDate: new Date(passedProp.EndDate),
                key: 'selection'
            }];
            setDateRange(newDateRange);
            setOldDateRange(newDateRange);
        }
    }, [passedProp.ID]);
  const renderStaticRangeLabel = () => {
    return (
      <div>
        <button onClick={() => handleStaticRangeClick('nextWeek')}>Next Week</button>
        <button onClick={() => handleStaticRangeClick('nextMonth')}>Next Month</button>
      </div>
    );
  };
    const handleSelect = (ranges) => {
        const { selection } = ranges;
        setDateRange([selection]);
        if (updateDates) {
            updateDates(selection.startDate, selection.endDate);
        }
    };
  const asyncSetDate = async () => {
    const body = {
        StartDate: dateRange[0].startDate.toISOString(),
        EndDate: dateRange[0].endDate.toISOString(),
        ID: passedProp.ID
    }
      setIsLoading(true);
      try {
          const response = await fetch('https://ms26uksm37.execute-api.eu-north-1.amazonaws.com/dev/UpdateAccommodation', {
              method: 'PUT',
              body: JSON.stringify(body),
              headers: {'Content-type': 'application/json; charset=UTF-8',
              }
          });
          if (!response.ok) {
              alert("Something went wrong, please try again later...")
              throw new Error('Failed to fetch');
          } else {
              const data = await response.json();
              const jsonData = JSON.parse(data.body);
              if (jsonData.updatedAttributes) {
                  const updatedAttributes = jsonData.updatedAttributes;
                  passedProp.StartDate = updatedAttributes.StartDate;
                  passedProp.EndDate = updatedAttributes.EndDate;
                  alert("Update successful!")
              } else {
                  alert("Something went wrong, please try again later...")
                  console.log("updatedAttributes is missing in the response");
              }
          }
      } catch (error) {
          console.error("Unexpected error:", error);
      } finally {
          setIsLoading(false);
      }
  };

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
              onChange={(ranges) => handleSelect(ranges)}
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
                      range: () => ({startDate: new Date(), endDate: new Date()}),
                      isSelected: () => false
                  },
                  {
                      label: 'This Week',
                      range: () => ({startDate: new Date(), endDate: addWeeks(new Date(), 1)}),
                      isSelected: () => false
                  },
                  {
                      label: 'Next Week',
                      range: () => ({startDate: addWeeks(new Date(), 1), endDate: addWeeks(new Date(), 2)}),
                      isSelected: () => false
                  },
                  {
                      label: 'This Month',
                      range: () => ({startDate: new Date(), endDate: addMonths(new Date(), 1)}),
                      isSelected: () => false
                  },
                  {
                      label: 'Next Month',
                      range: () => ({startDate: addMonths(new Date(), 1), endDate: addMonths(new Date(), 2)}),
                      isSelected: () => false
                  }
              ]}
          />
          {!isNew ? (
              <div className="button-box">
                  <button className="undo-btn" onClick={resetDates}>
                      <img src={returner} className="returner" alt="Return"></img>
                      <p className="btn-text">Undo</p>
                  </button>
                  <button className="save-btn" onClick={asyncSetDate}>
                      <p className="btn-text">Save</p>
                  </button>
              </div>
          ) : (
              <p>Dates can also be set later from Host dashboard -> Calendar</p>
          )}
      </div>
  );
}

export default Calendar;
