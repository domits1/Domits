import React from 'react'
import LabeledInput from './LabeledInput'
import RadioGroup from './RadioGroup'

function SpecificationForm({type, specifications, updateSpecification}) {
  return (
    <div className="specification-form">
      {type == 'boat' ? (
        <>
          <h1>General</h1>
          <RadioGroup
            label="Are you a professional?"
            name="isPro"
            options={['Yes', 'No']}
            selectedValue={specifications.isPro ? 'Yes' : 'No'}
            onChange={value => updateSpecification('isPro', value === 'Yes')}
          />
          <LabeledInput
            label="Manufacturer*"
            value={specifications.Manufacturer || ''}
            onChange={event =>
              updateSpecification('Manufacturer', event.target.value)
            }
            placeholder="Enter the manufacturer of your boat"
          />
          <LabeledInput
            label="Model*"
            value={specifications.Model || ''}
            onChange={event => updateSpecification('Model', event.target.value)}
            placeholder="Enter the name of the model"
          />
          <RadioGroup
            label="Is your boat rented with a skipper?"
            name="RentedWithSkipper"
            options={['Yes', 'No']}
            selectedValue={specifications.RentedWithSkipper ? 'Yes' : 'No'}
            onChange={value =>
              updateSpecification('RentedWithSkipper', value === 'Yes')
            }
          />
          <RadioGroup
            label="Does your boat need a boating license?"
            name="HasLicense"
            options={['Yes', 'No']}
            selectedValue={specifications.HasLicense ? 'Yes' : 'No'}
            onChange={value =>
              updateSpecification('HasLicense', value === 'Yes')
            }
          />
          <LabeledInput
            label="General periodic inspection*"
            type="date"
            value={specifications.GPI || ''}
            onChange={event => updateSpecification('GPI', event.target.value)}
            placeholder="DD/MM/YYYY"
          />
          <h1>Technical</h1>
          <LabeledInput
            label="Capacity (allowed)"
            value={specifications.Capacity || ''}
            onChange={event =>
              updateSpecification('Capacity', event.target.value)
            }
            placeholder="0"
          />
          <LabeledInput
            label="Length (m)"
            value={specifications.Length || ''}
            onChange={event =>
              updateSpecification('Length', event.target.value)
            }
            placeholder="0"
          />
          <LabeledInput
            label="Fuel (L/h)"
            value={specifications.FuelTank || ''}
            onChange={event =>
              updateSpecification('FuelTank', event.target.value)
            }
            placeholder="0"
          />
          <LabeledInput
            label="Top speed (Km)"
            value={specifications.Speed || ''}
            onChange={event => updateSpecification('Speed', event.target.value)}
            placeholder="0"
          />
          <LabeledInput
            label="Year of construction"
            type="number"
            value={specifications.YOC || ''}
            onChange={event => {
              updateSpecification('YOC', event.target.value)
            }}
            min={1900}
            max={new Date().getFullYear()}
            placeholder="YYYY"
          />
          <LabeledInput
            label="Renovated"
            type="number"
            value={specifications.Renovated || ''}
            onChange={event =>
              updateSpecification('Renovated', event.target.value)
            }
            min={1900}
            max={new Date().getFullYear()}
            placeholder="YYYY"
          />
        </>
      ) : type == 'camper' ? (
        <>
          <RadioGroup
            label="Category"
            name="Category"
            options={['Small Camper', 'Medium Camper', 'Large Camper']} // Replace with camperCategories if dynamic
            selectedValue={specifications.Category || ''}
            onChange={value => updateSpecification('Category', value)}
          />
          <LabeledInput
            label="License plate*"
            value={specifications.LicensePlate || ''}
            onChange={event =>
              updateSpecification('LicensePlate', event.target.value)
            }
            placeholder="Enter the characters of your license plate"
          />
          <LabeledInput
            label="Brand*"
            value={specifications.CamperBrand || ''}
            onChange={event =>
              updateSpecification('CamperBrand', event.target.value)
            }
            placeholder="Enter the brand of your camper"
          />
          <LabeledInput
            label="Model*"
            value={specifications.Model || ''}
            onChange={event => updateSpecification('Model', event.target.value)}
            placeholder="Enter the name of the model"
          />
          <LabeledInput
            label="Required driver’s license"
            value={specifications.Requirement || ''}
            onChange={event =>
              updateSpecification('Requirement', event.target.value)
            }
            placeholder="Select the required license type"
          />
          <LabeledInput
            label="General periodic inspection*"
            type="date"
            value={specifications.GPI || ''}
            onChange={event => updateSpecification('GPI', event.target.value)}
            placeholder="DD/MM/YYYY"
          />
          <h1>Technical</h1>
          <LabeledInput
            label="Length (m)"
            value={specifications.Length || ''}
            onChange={event =>
              updateSpecification('Length', event.target.value)
            }
            placeholder="0"
          />
          <LabeledInput
            label="Height (m)"
            value={specifications.Height || ''}
            onChange={event =>
              updateSpecification('Height', event.target.value)
            }
            placeholder="0"
          />
          <LabeledInput
            label="Transmission"
            value={specifications.Transmission || ''}
            onChange={event =>
              updateSpecification('Transmission', event.target.value)
            }
            placeholder="Manual or Automatic"
          />
          <LabeledInput
            label="Fuel (L/h)"
            value={specifications.FuelTank || ''}
            onChange={event =>
              updateSpecification('FuelTank', event.target.value)
            }
            placeholder="0"
          />
          <LabeledInput
            label="Year of construction"
            type="number"
            value={specifications.YOC || ''}
            onChange={event => updateSpecification('YOC', event.target.value)}
            min={1900}
            max={new Date().getFullYear()}
            placeholder="YYYY"
          />
          <LabeledInput
            label="Renovated"
            type="number"
            value={specifications.Renovated || ''}
            onChange={event =>
              updateSpecification('Renovated', event.target.value)
            }
            min={1900}
            max={new Date().getFullYear()}
            placeholder="YYYY"
          />
          <h1>Additional Features</h1>
          <div className="checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={specifications.FWD || false}
                onChange={e => updateSpecification('FWD', e.target.checked)}
              />
              4 x 4 Four-Wheel Drive
            </label>
            <label>
              <input
                type="checkbox"
                checked={specifications.SelfBuilt || false}
                onChange={e =>
                  updateSpecification('SelfBuilt', e.target.checked)
                }
              />
              My camper is self-built
            </label>
          </div>
        </>
      ) : null}
    </div>
  )
}

export default SpecificationForm
