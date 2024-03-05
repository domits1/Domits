import React, { Component } from 'react';
import huis from "../../images/icons/house.png";
import boothuis from "../../images/icons/house-boat.png";
import appartement from "../../images/icons/flat.png";
import camper from "../../images/icons/camper-van.png";
import villa from "../../images/icons/mansion.png";
import { useNavigate } from 'react-router-dom';
import FlowContext from '../../FlowContext';

function WithNavigate(props) {
  let navigate = useNavigate();
  return <Calculator {...props} navigate={navigate} />;
}

class Calculator extends Component {
  constructor(props) {
    super(props);
    this.state = {
      page: 1,
      selectedCards: {
        1: null,
        2: null,
        3: null
      },
      cardInfo: {
        1: null,
        2: null,
        3: null
      },
      priceIndicator: {
        1: null,
        2: null,
        3: null
      }
    };
  }

  static contextType = FlowContext; // Assigning context to the class

    navigateToRegister = () => {
    const { setFlowState } = this.context; // Accessing context
    setFlowState({ isHost: true });
    this.props.navigate('/register'); // Corrected to use navigate from props
  };

  pageUpdater = (pageNumber) => {
    this.setState({
      page: pageNumber
    });
  };

  handleCardClick = (cardIndex, priceIndex, cardText) => {
    const { page, selectedCards, priceIndicator, cardInfo } = this.state;
    this.setState({
      selectedCards: {
        ...selectedCards,
        [page]: cardIndex
      },
      priceIndicator: {
        ...priceIndicator,
        [page]: priceIndex
      },
      cardInfo: {
        ...cardInfo,
        [page]: cardText
      }
    });
    console.log(priceIndicator)
  };
  areAllCardsSelected = () => {
    const { selectedCards } = this.state;
    return Object.values(selectedCards).every((card) => card !== null);
  };
  renderPageContent = (page) => {
    const { selectedCards } = this.state;

    switch (page) {
      case 1:
        return (
          <div>
            <p>What type of real-estate do you want to host?</p>
            <div className='cardHolder'>
              {this.renderCard(0, "House", huis, selectedCards[1] === 0, 1500)}
              {this.renderCard(1, "Appartement", appartement, selectedCards[1] === 1, 950)}
              {this.renderCard(2, "Camper", camper, selectedCards[1] === 2, 1700)}
              {this.renderCard(3, "Boat", boothuis, selectedCards[1] === 3, 720)}
              {this.renderCard(4, "Villa", villa, selectedCards[1] === 4, 10500)}
            </div>
            <div className='buttonHolder'>
            <button className='nextButtons' onClick={this.resetCalculator}>Reset</button>
              <button className='nextButtons' onClick={() => this.pageUpdater(page + 1)}>Next</button>
            </div>
          </div>
        );
      case 2:
        return (
          <div>
            <p>What are the measurements of this real-estate?</p>
            <div className='cardHolder'>
              {this.renderCard(0, '< 25m²', null, selectedCards[2] === 0, 0.80)}
              {this.renderCard(1, '25 - 50 m²', null, selectedCards[2] === 1, 0.95)}
              {this.renderCard(2, '50 - 75 m²', null, selectedCards[2] === 2, 1)}
              {this.renderCard(3, '75 - 100 m²', null, selectedCards[2] === 3, 1.15)}
              {this.renderCard(4, '> 100 m²', null, selectedCards[2] === 4, 1.30)}
            </div>
            <div className='buttonHolder'>
              <button className='nextButtons' onClick={() => this.pageUpdater(page - 1)}>Previous</button>
              <button className='nextButtons' onClick={() => this.pageUpdater(page + 1)}>Next</button>
            </div>
          </div>
        );
      case 3:
        return (
          <div>
            <p>How many sleeping places does your real-estate have?</p>
            <div className='cardHolder'>
              {this.renderCard(0, '1', null, selectedCards[3] === 0, 1)}
              {this.renderCard(1, '2', null, selectedCards[3] === 1, 1.05)}
              {this.renderCard(2, '3', null, selectedCards[3] === 2, 1.20)}
              {this.renderCard(3, '4', null, selectedCards[3] === 3, 1.23)}
              {this.renderCard(4, '5 or more', null, selectedCards[3] === 4, 1.50)}
            </div>
            <div className='buttonHolder'>
              <button className='nextButtons' onClick={() => this.pageUpdater(page - 1)}>Previous</button>

              <button
                className='nextButtons'
                onClick={this.areAllCardsSelected() ? () => this.pageUpdater(page + 1) : null}
                style={{
                  backgroundColor: 'green',
                  cursor: this.areAllCardsSelected() ? 'pointer' : 'not-allowed',
                  opacity: this.areAllCardsSelected() ? 1 : 0.5
                }}
                disabled={!this.areAllCardsSelected()}
              >
                Calculate
              </button>
            </div>
          </div>

        );
      case 4:
        return (
          <div>
            <div className='priceDisplay'>
              <h2>Est. ${this.calculatePrice()} per month</h2>
            </div>
            <div className='infoHolder'>
              <h4 className="infoHeader">Based on:</h4>
              <p className="info">Real Estate Type: {this.displayInfo(1)}</p>
              <p className="info">Measurements: {this.displayInfo(2)}</p>
              <p className="info">Sleeping Places: {this.displayInfo(3)}</p>
              <p className="info">Service fees: 12%</p>
              <p>If this estimation interests you, please consider hosting on Domits!</p>
            </div>
            <div className='buttonHolder'>
            <button className='nextButtons' onClick={this.resetCalculator}>Reset</button>
            <button className='nextButtons' onClick={this.navigateToRegister}>Enlist</button>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  renderCard = (index, text, image, isSelected, price) => {
    return (
      <div
        key={index}
        className={`card ${isSelected ? 'selectedCard' : ''}`}
        onClick={() => this.handleCardClick(index, price, text)}
      >
        <p>{text}</p>
        {image && <img className="cardImage" src={image} alt={text} />}
      </div>

    );
  };

  resetCalculator = () => {
    this.setState({
      page: 1,
      selectedCards: {
        1: null,
        2: null,
        3: null
      },
      priceIndicator: {
        1: null,
        2: null,
        3: null
      }
    });
  };

  calculatePrice = () => {
    const { priceIndicator } = this.state;
    const totaal = priceIndicator[1] * priceIndicator[2] * priceIndicator[3] * 0.88;
    return totaal.toFixed(2);
  }
  displayInfo = (number) => {
    const { cardInfo } = this.state;
    return cardInfo[number]
  }

  render() {
    const { page } = this.state;

    return (
      <div>
        <div className="pages">
          <button
            className={`pageButtons ${page === 1 ? 'selected' : ''}`}
            onClick={() => this.pageUpdater(1)}
          >
            1
          </button>
          <button
            className={`pageButtons ${page === 2 ? 'selected' : ''}`}
            onClick={() => this.pageUpdater(2)}
          >
            2
          </button>
          <button
            className={`pageButtons ${page === 3 ? 'selected' : ''}`}
            onClick={() => this.pageUpdater(3)}
          >
            3
          </button>
        </div>

        <div className="page">
          {this.renderPageContent(page)}
        </div>
      </div>
    );
  }
}

export default WithNavigate;
