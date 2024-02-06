import React, { Component } from 'react';
import huis from "../../images/huis-illustratie.png";
import appartement from "../../images/appartement-illustratie.png";
import camper from "../../images/camper-illustratie.png";
import villa from "../../images/villa-illustratie.png";

class Calculator extends Component {
  constructor(props) {
    super(props);
    this.state = {
      page: 1,
      selectedCards: {
        1: null,
        2: null,
        3: null
      }
    };
  }

  pageUpdater = (pageNumber) => {
    this.setState({
      page: pageNumber
    });
  };

  handleCardClick = (cardIndex) => {
    const { page, selectedCards } = this.state;
    this.setState({
      selectedCards: {
        ...selectedCards,
        [page]: cardIndex
      }
    });
  };

  renderPageContent = (page) => {
    const { selectedCards } = this.state;

    switch (page) {
      case 1:
        return (
          <div>
            <p>What type of real-estate do you want to host?</p>
            <div className='cardHolder'>
              {this.renderCard(0, "House", huis, selectedCards[1] === 0)}
              {this.renderCard(1, "Appartement", appartement, selectedCards[1] === 1)}
              {this.renderCard(2, "Camper", camper, selectedCards[1] === 2)}
              {this.renderCard(3, "Boathouse", huis, selectedCards[1] === 3)}
              {this.renderCard(4, "Villa", villa, selectedCards[1] === 4)}
            </div>
            <div className='buttonHolder'>    
              <button className='nextButtons'>Reset</button>
              <button className='nextButtons' onClick={() => this.pageUpdater(page + 1)}>Next</button>
            </div>
          </div>
        );
      case 2:
        return (
          <div>
            <p>What are the measurements of this real-estate?</p>
            <div className='cardHolder'>
              {this.renderCard(0, '< 25m²', null, selectedCards[2] === 0)}
              {this.renderCard(1, '25 - 50 m²', null, selectedCards[2] === 1)}
              {this.renderCard(2, '50 - 75 m²', null, selectedCards[2] === 2)}
              {this.renderCard(3, '75 - 100 m²', null, selectedCards[2] === 3)}
              {this.renderCard(4, '> 100 m²', null, selectedCards[2] === 4)}
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
              {this.renderCard(0, '1', null, selectedCards[3] === 0)}
              {this.renderCard(1, '2', null, selectedCards[3] === 1)}
              {this.renderCard(2, '3', null, selectedCards[3] === 2)}
              {this.renderCard(3, '4', null, selectedCards[3] === 3)}
              {this.renderCard(4, 'More than 5', null, selectedCards[3] === 4)}
            </div>
            <div className='buttonHolder'>
              <button className='nextButtons' onClick={() => this.pageUpdater(page - 1)}>Previous</button>
              <button className='nextButtons' style={{backgroundColor:'green'}}>Calculate</button>
            </div>
          </div>
          
        );
      default:
        return null;
    }
  };

  renderCard = (index, text, image, isSelected) => {
    return (
      <div
        key={index}
        className={`card ${isSelected ? 'selectedCard' : ''}`}
        onClick={() => this.handleCardClick(index)}
      >
        <p>{text}</p>
        {image && <img className="cardImage" src={image} alt={text} />}
      </div>
      
    );
  };

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
          <p>Current Page: {page}</p>
        </div>

        <div className="page">
          {this.renderPageContent(page)}
        </div>
      </div>
    );
  }
}

export default Calculator;
