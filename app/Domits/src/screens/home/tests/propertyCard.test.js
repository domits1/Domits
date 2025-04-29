import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import PropertyCard from '../views/PropertyCard';
import { PROPERTY_DETAILS_SCREEN } from '../../../navigation/utils/NavigationNameConstants';
import { S3URL } from '../../../store/constants';
import { useNavigation } from '@react-navigation/native';
import { describe, it, expect, beforeEach } from '@jest/globals';

jest.mock('@react-navigation/native', () => ({
    useNavigation: jest.fn(),
}));

describe('PropertyCard Component', () => {
    let props;
    let navigateMock;

    beforeEach(() => {
        navigateMock = jest.fn();
        useNavigation.mockReturnValue({ navigate: navigateMock });

        props = {
            property: {
                property: {
                    id: 'prop123',
                },
                propertyImages: [{ key: 'image.jpg' }],
                propertyLocation: { country: 'Netherlands', city: 'Amsterdam' },
                propertyPricing: { roomRate: 120 },
            },
            isFavorite: false,
            onFavoritePress: jest.fn(),
        };
    });

    it('renders property info and image correctly', () => {
        render(<PropertyCard {...props} />);

        expect(screen.getByTestId('CardImage').props.source.uri).toBe(`${S3URL}image.jpg`);
        expect(screen.getByTestId('PropertyLocation').props.children.join('')).toContain('Netherlands, Amsterdam');
        expect(screen.getByTestId('PropertyPricing').props.children.join('')).toContain("$120");
    });

    it('calls navigation.navigate when card is pressed', () => {
        render(<PropertyCard {...props} />);

        fireEvent.press(screen.getByTestId('CardContainer'));

        expect(navigateMock).toHaveBeenCalledWith(PROPERTY_DETAILS_SCREEN, {
            property: props.property,
        });
    });

    it('renders unfavorited icon when isFavorite is false', () => {
        render(<PropertyCard {...props} />);
        expect(screen.getByTestId('UnfavoritedIcon')).toBeTruthy();
    });

    it('renders favorited icon when isFavorite is true', () => {
        props.isFavorite = true;
        render(<PropertyCard {...props} />);
        expect(screen.getByTestId('FavoritedIcon')).toBeTruthy();
    });

    it('calls onFavoritePress with correct ID when favorite button is pressed', () => {
        render(<PropertyCard {...props} />);
        fireEvent.press(screen.getByTestId('FavoriteButton'));
        expect(props.onFavoritePress).toHaveBeenCalledWith('prop123');
    });
});
