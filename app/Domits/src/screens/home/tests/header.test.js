import {fireEvent, screen, render} from '@testing-library/react-native';
import {initReactI18next} from 'react-i18next';
import i18n from "i18next";
import {beforeEach, describe, expect, it} from "@jest/globals";
import {LanguageReferences} from "../../../features/translation/services/Languages";
import Header from "../components/header";

describe('Header Component', () => {

    let props;

    beforeEach(async () => {
        await i18n.use(initReactI18next).init({
            lng: 'en',
            fallbackLng: 'en',
            resources: LanguageReferences,
        });
        props = {
            country: "",
            setCountry: jest.fn(),
            loading: false,
            onSearchButtonPress: jest.fn(),
            onCancelButtonPress: jest.fn(),
        }
    })

    it('renders TextInput and search button', () => {
        render(<Header {...props} />)

        expect(screen.getByTestId('SearchBar')).toBeTruthy();
        expect(screen.getByTestId('SearchButton')).toBeTruthy();
    });

    it('renders delete button after TextInput is given', () => {
        render(<Header {...props} />)

        expect(screen.queryByTestId('delete-button')).toBeNull();

        props.country = "Spain";
        render(<Header {...props} />)

        expect(screen.getByTestId('delete-button')).toBeTruthy();
    })

    it('calls setCountry when input changes', () => {
        render(<Header {...props} />)

        const input = screen.getByTestId('SearchBar');
        expect(input).toBeTruthy();

        fireEvent.changeText(input, 'Spain');
        expect(props.setCountry).toHaveBeenCalled();
    });

    it('calls onSearchButtonPress with the country on search icon press', () => {
        props.country = "Spain"
        render(<Header {...props} />)

        const button = screen.getByTestId('SearchButton')
        expect(button).toBeTruthy();

        fireEvent.press(button);
        expect(props.onSearchButtonPress).toHaveBeenCalledWith('Spain');
    });

    it('renders cancel icon if country is set and calls cancel + reset', () => {
        props.country = "Spain";
        render(<Header {...props} />)

        const button = screen.getByTestId('delete-button');
        expect(button).toBeTruthy();

        fireEvent.press(button);

        expect(props.onCancelButtonPress).toHaveBeenCalled();
        expect(props.setCountry).toHaveBeenCalledWith('');
    });

    it('disables buttons if loading is true', () => {
        props.country = "Spain";
        props.loading = true;

        render(<Header {...props} />)

        const deleteButton = screen.getByTestId('delete-button');
        expect(deleteButton.props.accessibilityState?.disabled).toBe(true);

        const searchButton = screen.getByTestId('SearchButton');
        expect(searchButton.props.accessibilityState?.disabled).toBe(true);
    });
});
