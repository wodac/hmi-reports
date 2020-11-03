// @ts-check
import React from 'react';
import './App.css';
import '../theme.scss';
import { Button, Form, Card, Col, Alert, Spinner, Fade } from 'react-bootstrap'
import { debounce } from 'lodash';

/**
 * @typedef {'added' | 'saved' | 'modified' | 'error' | ''} SyncState
 */

/**
 * @typedef {{name: string;phone: string;_id: string; isNew?: boolean }} Contact
 */

/**
 * @typedef PhoneNumbersAPI
 * @prop { () => Promise<Contact[]> } loadContacts
 * @prop { (contactIDs: string[]) => Promise<void> } deleteContacts
 * @prop { (contact: Partial<Contact>) => Promise<void> } modifyContact
 * @prop { (contact: Partial<Contact>) => Promise<{ _id: string }> } addContact
 */

export default class PhoneNumbersList extends React.Component {

    /**
     * @type {Readonly<PhoneNumbersAPI>}
     */
    props

    /**
     * @type { { contactList: (Contact & { checked: boolean })[], firstLoad: boolean, connectionError: any, syncState: SyncState } }
     */
    state
    /**
     * 
     * @param { Readonly<PhoneNumbersAPI> } props 
     */
    constructor(props) {
        super(props)
        this.state = {
            contactList: [],
            syncState: '',
            firstLoad: true,
            connectionError: false
        }
        this.list = React.createRef()
    }

    componentDidMount() {
        this.props.loadContacts().then(contactList =>
            this.setState({
                contactList: contactList.map(contact => ({ ...contact, checked: false })),
                firstLoad: false
            })
        ).catch(reason => {
            console.error(reason);
            this.setState({
                connectionError: reason
            })
        })
    }

    /**
     * @param { string } id 
     * @param { boolean } checked
     */
    onChecked = (id, checked) => {
        const contactList = this.state.contactList
        const i = contactList.findIndex(contact => contact._id === id)
        contactList[i].checked = checked
        this.setState({ contactList })
    }

    checkAll = (checked) => {
        // this.list.current.querySelectorAll("input.contact-checkbox").forEach(el => {el.checked = checked})
        this.setState(state => {
            return {
                contactList: state.contactList.map(contact => ({ ...contact, checked }))
            }
        })
    }

    onDeleteClicked = () => {
        const contactsToDelete = this.state.contactList.filter(contact => contact.checked)
        const idsToDelete = contactsToDelete.map(contact => contact._id);
        this.props.deleteContacts(idsToDelete).then(() => {
            this.setState(state => {
                const contactList = state.contactList.filter(contact => !idsToDelete.includes(contact._id))
                return { contactList }
            })
        })
    }

    addContactField = () => {
        this.setState(state => {
            if (this.isAddContactFieldPresent()) return
            return {
                contactList: [...state.contactList, { isNew: true, name: '', phone: '' }]
            }
        })
    }

    isAddContactFieldPresent = () => {
        return this.state.contactList.some(contact => contact.isNew);
    }

    render() {
        return (
            <Card className="phone-numbers-interface">
                <Card.Header className="phone-numbers-controls">
                    <Button onClick={this.addContactField} variant="success"
                        className="mr-2" disabled={this.isAddContactFieldPresent()}>
                        Dodaj
                    </Button>
                    <Button onClick={this.onDeleteClicked} variant="danger"
                        className="mr-2" disabled={!this.state.contactList.some(c => c.checked)}>
                        Usuń
                    </Button>
                    <Button onClick={() => this.checkAll(true)} variant="outline-secondary" className="mr-2">
                        Zaznacz wszystko
                    </Button>
                    <Button onClick={() => this.checkAll(false)} variant="outline-secondary" className="mr-2">
                        Odznacz wszystko
                    </Button>
                    <SyncStatus timeout={3500} className="float-right py-2" status={this.state.syncState} />
                </Card.Header>
                <Card.Body className="phone-numbers-list text-center" ref={this.list}>
                    {this.state.connectionError ?
                        <span className="text-danger">Wystąpił błąd: {this.state.connectionError.toString()}</span> :
                        this.state.firstLoad ?
                            <Spinner animation="border" /> :
                            this.state.contactList.length > 0 ?
                                this.getListElements() :
                                <span>Nie dodano jeszcze żadnych numerów</span>
                    }
                </Card.Body>
            </Card>
        )
    }

    onContactChange = debounce(
        /**
         * @param {Partial<Contact>} contact 
         */
        (contact) => {
            this.saveContact(contact)
        },
        2000)

    /**
     * 
     * @param {Partial<Contact>} contact 
     */
    saveContact = (contact) => {
        /**
         * 
         * @param { Promise<void> } promise 
         */
        const handlePromises = promise => promise
            .then(() => {
                this.setState({ syncState: 'saved' })
            })
            .catch(() => this.setState({ syncState: 'error' }))

        this.setState({ syncState: 'modified' })
        if (!contact.isNew) {
            return handlePromises(this.props.modifyContact(contact))
        }
        else {
            const promise = this.props.addContact({ name: contact.name, phone: contact.phone })
                .then(
                    (res) => this.setState(state => {
                        const contactList = state.contactList
                        const addedIndex = contactList.findIndex(contact => contact.isNew)
                        contactList[addedIndex] = {
                            _id: res._id,
                            name: contact.name,
                            phone: contact.phone
                        }
                        return {
                            contactList, syncState: 'added'
                        }
                    })
                )
            return handlePromises(promise)
        }
    }

    getListElements = () => {
        const contactList = this.state.contactList;
        return contactList.map(
            contact => (
                <PhoneNumberElement {...contact}
                    key={contact._id || String(Date.now())}
                    onChange={this.onContactChange}
                    onChecked={this.onChecked} />
            )
        );
    }

    componentDidUpdate() {
        console.log('list updated');
    }
}

class SyncStatus extends React.Component {

    /**
     * @type { { status: SyncState, timeout?: number } & Partial<import('react').AllHTMLAttributes> }
     */
    props

    /**
     * @type { { visible: boolean } }
     */
    state

    constructor(props) {
        super(props)
        this.state = {
            visible: true
        }
    }

    componentDidUpdate = () => {
        if (this.props.status === 'saved') {
            this.timeout = setTimeout(() => {
                this.setState((state, props) => ({ visible: props.status === 'modified' }))
            }, this.props.timeout || 3000)
        } else if (!this.state.visible) this.setState({ visible: true })
    }

    render() {
        return (
            <div {...this.props}>
                <Fade in={this.state.visible}>
                    {this.renderMainContent()}
                </Fade>
            </div>
        )
    }

    renderMainContent = () => {
        switch (this.props.status) {
            case 'modified':
                return <Spinner animation="border" size="sm">
                    <span className="sr-only">{this.getStatusText()}</span>
                </Spinner>

            default:
                return <span className={this.getSpanClass()}>{this.getStatusText()}</span>
        }
    }

    getSpanClass = () => {
        switch (this.props.status) {
            case 'modified':
                return 'text-light'

            case 'saved':
            case 'added':
                return 'text-success'

            case 'error':
                return 'text-danger'

            default:
                return ''
        }
    }

    getStatusText = () => {
        switch (this.props.status) {
            case 'error':
                return 'Wystąpił błąd'

            case 'added':
                return 'Dodano nr telefonu'

            case 'saved':
                return 'Zapisano'

            case 'modified':
                return 'Zapisywanie...'
        }
    }
}

/**
 * @typedef PhoneNumberProps
 * @prop { boolean } checked
 * @prop { boolean } [isNew]
 * @prop { (contact: Partial<Contact>) => void } onChange
 * @prop { ( id: string, checked: boolean ) => void } onChecked
 * @prop {string} name
 * @prop {string} phone
 * @prop {string} _id
 */

/**
 * 
 */
class PhoneNumberElement extends React.Component {
    /**
     * @type { Readonly<PhoneNumberProps> }
     */
    props
    /**
     * 
     * @param {Readonly<PhoneNumberProps>} props 
     */
    constructor(props) {
        super(props)
        this.state = {
            name: props.name,
            phone: props.phone,
            checked: props.checked,
            phoneNumberInvalid: false
        }
    }

    /**
     * 
     * @param {React.ChangeEvent<HTMLInputElement>} event 
     */
    handleChange = (event) => {
        const elem = event.target
        const { name, value } = elem
        let changed = {
            [name]: value
        };
        this.setState(changed)
        if (name === 'phone') {
            const phoneNumberInvalid = !this.isPhoneNumberValid(value);
            this.setState({ phoneNumberInvalid })
            if (phoneNumberInvalid) return
        }
        if (this.props.isNew) {
            if (this.state.name === '' || this.state.phone === '') return
            changed = {
                name: this.state.name,
                phone: this.state.phone,
                ...changed
            }
        }
        this.props.onChange({ ...changed, _id: this.props._id, isNew: this.props.isNew })
    }

    /**
     * @param { React.ChangeEvent<HTMLInputElement> } event 
     */
    onChecked = (event) => {
        const elem = event.target
        this.setState({
            checked: elem.checked
        })
        this.props.onChecked(this.props._id, elem.checked)
    }

    /** @returns { boolean } */
    isPhoneNumberValid = (number) => {
        return /^(\+?48[ -]?)?[0-9]{3}[ -]?[0-9]{3}[ -]?[0-9]{3}$/.test(number || this.state.phone)
    }

    render() {
        return (
            <Form.Group className="phone-number-element">
                <Form.Row>
                    <Col xs={1} style={{ maxWidth: "1.7rem", paddingTop: "0.3rem" }}>
                        <Form.Check type="checkbox" custom id={this.props._id} onChange={this.onChecked} checked={this.props.checked} />
                    </Col>
                    <Col xs={7}>
                        <Form.Control
                            name="name" type="text" value={this.state.name}
                            onChange={this.handleChange} />
                    </Col>
                    <Col>
                        <Form.Group>
                            <Form.Control isInvalid={!this.isPhoneNumberValid()}
                                name="phone" type="phone" value={this.state.phone}
                                onChange={this.handleChange} />
                            <Form.Control.Feedback type="invalid">
                                Nieprawidłowy numer telefonu
                            </Form.Control.Feedback>
                        </Form.Group>
                    </Col>
                </Form.Row>
            </Form.Group>
        )
    }
}

class ContactField extends React.Component {
    /**
     * @typedef FieldState
     * @prop { string } value
     * @prop { string } name
     */
    /** @type {Readonly<{ onChange: (state: FieldState) => void } & FieldState>} */
    props
    constructor(props) {
        super(props)
        this.state = {
            value: props.value,
            name: props.name,
            editing: false
        }
        /** @type { React.RefObject<HTMLInputElement> } */
        this.input = React.createRef()
    }

    /**
     * @param { React.ChangeEvent<HTMLInputElement> } event 
     */
    handleChange = (event) => {
        const elem = event.target
        this.setState({
            value: elem.value
        })
        this.props.onChange({
            value: elem.value,
            name: this.props.name
        })
    }

    enableEditing = () => this.setState({ editing: true })
    disableEditing = () => this.setState({ editing: false })

    render() {
        return (
            <div className={`contact-${this.props.name}-container`}>
                <span onClick={() => {
                    this.setState({ editing: true })
                    setTimeout(() => this.input.current.focus(), 0)
                }}
                    className={`contact-${this.props.name}`} hidden={this.state.editing}>{this.state.value}</span>
                <input ref={this.input} hidden={!this.state.editing}
                    onBlur={this.disableEditing} onKeyUp={(e) => {
                        if (e.key === "Enter") this.disableEditing()
                    }}
                    className={`contact-${this.props.name}-input`}
                    name={this.props.name} value={this.state.value}
                    onChange={this.handleChange} />
            </div>
        )
    }
}