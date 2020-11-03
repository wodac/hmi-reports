//@ts-check
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import React from 'react';
import './App.css';
import * as microsoftTeams from "@microsoft/teams-js";
import PhoneNumbersList from './PhoneNumbers';
import Axios from 'axios';
import { Container, Tab, Tabs } from 'react-bootstrap';
import Configuration from './Configuration';

/**
 * @template T
 * @param { number } time 
 * @param { T } [result] 
 * @returns { Promise<T> }
 */
const delayedPromise = (time, result) => {
  return new Promise(resolve => {
    setTimeout(() => resolve(result), time)
  })
}

const loadContacts = async () => {
  const resp = await Axios.get('/api/sms-numbers');
  console.log('get sms-numbers', resp.data);
  return resp.data.data;
};
const deleteContacts = async (ids) => {
  const resp = await Axios.delete('/api/sms-numbers', {
    data: { ids }
  });
  console.log('delete sms-numbers', resp.data);
};
const modifyContact = async (contact) => {
  const resp = await Axios.put('/api/sms-numbers', {
    data: contact
  });
  console.log('put sms-numbers', resp.data);
};
const addContact = async (contact) => {
  const resp = await Axios.post('/api/sms-numbers', {
    data: contact
  });
  console.log('post sms-numbers', resp.data);
  return resp.data
};
let contacts = [
  { _id: '1', name: 'wojciech', phone: '731866428' },
  { _id: '2', name: 'mama', phone: '720904740' },
  { _id: '3', name: 'tata', phone: '668891176' }
];
/**
 * The 'GroupTab' component renders the main tab content
 * of your app.
 */
class MainTab extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      context: {}
    }
  }

  componentDidMount() {
    // microsoftTeams.authentication.getUser({successCallback: (user) => {
    //   console.log(user)
    // }})
    // // Get the user context from Teams and set it in the state
    // microsoftTeams.getContext(
    //   /**
    //    * @param {import("@microsoft/teams-js").Context} context
    //    */
    //   (context) => {
    //     this.setState({
    //       context: context
    //     });
    //   });
    // Next steps: Error handling using the error object
  }

  render() {
    return (
      <Container className="py-2">
        <h3>Raportowanie awarii z panelu HMI</h3>
        <Tabs defaultActiveKey="numbersList">
          <Tab eventKey="numbersList" title="Lista telefonów">
            <PhoneNumbersList
              loadContacts={loadContacts}
              modifyContact={modifyContact}
              addContact={addContact}
              deleteContacts={deleteContacts}
            />
          </Tab>
          <Tab eventKey="config" title="Konfiguracja">
            <Configuration api={{
              getSettings: () => Axios.get('/api/config').then(resp => Object.entries(resp.data).map(a => ({ name: a[0], ...a[1] }))),
              setSettings: (data) => Axios.post('/api/config', {data: data.reduce((obj, sett) => {
                obj[sett.name] = sett.value
                return obj
              }, {})}).then(resp => resp.data)
            }} />
          </Tab>
        </Tabs>
      </Container>
    );
  }
}
export default MainTab;