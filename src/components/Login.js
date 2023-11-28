import {Amplify} from "aws-amplify";

import {
    Authenticator,
    View,
    Image,
    useTheme,
    Heading,
    useAuthenticator,
    Button,
} from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import logo from "../logo.svg";
import awsExports from '../aws-exports';

Amplify.configure(awsExports);

function App() {
    const components = {
        Header() {
            const { tokens } = useTheme();

            return (
                <View textAlign="center" padding={tokens.space.large}>
                    <Image
                        src={logo} className="App-logo" alt="logo"
                    />
                </View>
            );
        },
        SignUp: {
            Header() {
                const { tokens } = useTheme();

                return (
                    <Heading
                        padding={`${tokens.space.xl} 0 0 ${tokens.space.xl}`}
                        level={5}
                    >
                        Create a new account
                    </Heading>
                );
            },
            Footer() {
                const { toSignIn } = useAuthenticator();

                return (
                    <View textAlign="center">
                        <Button
                            fontWeight="normal"
                            onClick={toSignIn}
                            size="small"
                            variation="link"
                        >
                            Already have an account?
                        </Button>
                    </View>
                );
            },
        },
    };

    return (
        <Authenticator loginMechanisms={['email']} components={components}>
            {({ signOut }) => <button onClick={signOut}>Sign out</button>}
        </Authenticator>
    );
}

export default App;