import React, { useEffect, useState } from 'react';
import { Amplify, API, graphqlOperation} from "aws-amplify";
import awsconfig from '../../aws-exports';
import { AmplifySignOut, withAuthenticator } from '@aws-amplify/ui-react';
import { listAccommodations } from '../../graphql/queries';


Amplify.configure(awsconfig);

function Testroom() {

    const [accos, setAccos] = useState([])

    useEffect(() => {
        fetchAccos();
    }, [])

    const fetchAccos = async () => {
        try {
            const accoData = await API.graphql(graphqlOperation(listAccommodations));
            const accoList = accoData.data.listAccommodations.items;
            console.log('acco list', accoList);
            setAccos(accoList)
        } catch (error){
            console.log('error is fout gegaan', error)
        }
    }
    <div>
        <p>Testroom</p>
    </div>
}

export default withAuthenticator(Testroom);