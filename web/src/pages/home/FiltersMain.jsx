import React, { useState } from 'react';
import Slider from '@mui/material/Slider';

const FiltersMain = () => {
  const [priceValues, setPriceValues] = useState([0, 400]);

  return (
    <div style={{ display: 'flex' }}>
      <div style={{ flex: '0 0 auto', marginRight: '10px', width: '200px' }}>
        <Slider
          sx={{
            '& .MuiSlider-thumb': {
              width: 20,
              height: 20,
              backgroundColor: '#ffffff',
              border: '2px solid #d3d3d3',
              '&:hover': {
                boxShadow: '0 0 0 8px rgba(76, 175, 80, 0.2)',
              },
              '&.Mui-active': {
                boxShadow: '0 0 0 14px rgba(76, 175, 80, 0.2)',
              },
            },
            '& .MuiSlider-rail': {
              backgroundColor: '#e0e0e0',
              height: 4,
            },
            '& .MuiSlider-track': {
              backgroundColor: '#4caf50',
              height: 4,
            },
          }}
          value={priceValues}
          onChange={(e, newValues) => setPriceValues(newValues)}
          valueLabelDisplay="auto"
          min={15}
          max={400}
          step={1}
          valueLabelFormat={(value) => `€${value}`}
          disableSwap
        />
      </div>
      
    </div>
  );
};

export default FiltersMain;
