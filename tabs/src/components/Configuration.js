// @ts-check
import React from "react";
import { Badge, Button, Card, Col, Container, Collapse, Form, Row } from "react-bootstrap";

/**
 * @typedef ConfigAPI
 * @property { () => Promise<Config[]> } getSettings
 * @property { (settings: Partial<Config>[]) => Promise<void> } setSettings
 */

/**
 * @typedef ConfigState
 * @property { Partial<Config>[] } modified
 * @property { Config[] } settingsList
 * @property { any } [error]
 * @property { import("./PhoneNumbers").SyncState } syncState
 */

export default class Configuration extends React.Component {
    /** @type { ConfigState } */
    state = {
        modified: [],
        settingsList: [],
        error: null,
        syncState: ''
    }

    /** @type { { api: ConfigAPI } } */
    props

    componentDidMount() {
        this.props.api.getSettings().then(settingsList => {
            this.setState({ settingsList })
        })
    }

    /**
     * 
     * @param {string} name 
     * @param {any} value 
     */
    onChange = (name, value) => {
        this.setState(
            /** @param { ConfigState } state */
            state => {
                const { modified } = state
                const i = modified.findIndex(s => s.name === name);
                if (i > -1) {
                    modified[i].value = value
                } else modified.push({ name, value })
                return { modified }
            }
        )
    }

    onSave = () => {
        const modified = this.state.modified;
        this.setState({ syncState: 'modified' })
        this.props.api.setSettings(modified).then(() => {
            return this.props.api.getSettings()
        }).then(settingsList => {
            this.setState({ settingsList, syncState: 'saved' })
            setTimeout(() => this.setState({ syncState: '' }), 3000)
        }).catch(error => {
            console.error(error)
            this.setState({ error, syncState: 'error' })
        })
    }

    render() {
        return (
            <Card>
                <Container className="py-2">
                    {
                        this.state.error ?
                            <span className="text-danger">{this.state.error.toString()}</span> :
                            this.state.settingsList.map(setting =>
                                <ConfigElement {...setting} onChange={this.onChange} />
                            )
                    }
                    <Collapse in={this.state.modified.length > 0}>
                        <Row>
                            <Col sm="5" md="7">
                            {
                                this.state.syncState === 'modified' ?
                                    <Badge variant="info">Zapisywanie...</Badge> :
                                    this.state.syncState === 'saved' ?
                                        <Badge variant="success">Zapisano</Badge> : null
                            }
                            </Col>
                            <Col sm="5" md="4" className="text-center">
                                <Button disabled={this.state.syncState === 'modified'}
                                    onClick={this.onSave}>
                                    {this.state.syncState === 'modified' ? 'Zapisywanie...' : 'Zapisz'}
                                </Button>
                            </Col>
                        </Row>
                    </Collapse>
                </Container>
            </Card>
        )
    }
}

/**
 * @typedef {'string' | 'boolean' | 'number'} ConfigType
 */

/**
 * @typedef Config
 * @property { string } name
 * @property { string } description
 * @property { ConfigType } type
 * @property { string | boolean | number } value
 */

/**
 * @typedef ConfigElementProps
 * @property { string } name
 * @property { string } description
 * @property { ConfigType } type
 * @property { string | boolean | number } value
 * @property { (name: string, value) => void } onChange
 */

class ConfigElement extends React.Component {
    /** @type { ConfigElementProps } */
    props

    state = {
        value: null,
        modified: false
    }

    componentDidMount() {
        switch (this.props.type) {
            case 'string':
                this.inputType = 'text'
                break

            case 'number':
                this.inputType = 'number'
                break

            case 'boolean':
                this.inputType = 'checkbox'
                break
        }
        this.setState({
            value: this.props.value
        })
    }

    /**
     * @param { React.ChangeEvent<HTMLInputElement> } event
     */
    onChange = (event) => {
        const elem = event.target
        let value
        if (this.props.type === 'boolean') value = elem.checked
        else value = elem.value
        this.setState({ value, modified: value !== this.props.value })
        this.props.onChange(this.props.name, value)
    }

    render() {
        return (
            <Form.Row className="mt-1 align-items-center">
                <Col sm="5" md="7" className='pt-1'>
                    <Form.Label>{this.props.description}</Form.Label>
                </Col>
                <Col sm="5" md="4">
                    <div className="text-center">
                        {
                            this.props.type === 'boolean' ?
                                <Form.Check onChange={this.onChange} checked={this.state.value} /> :
                                <Form.Control onChange={this.onChange} type={this.inputType}
                                    value={this.state.value} />
                        }
                    </div>
                </Col>
                <Col>{this.state.modified ? <Badge variant="info">mod</Badge> : null}</Col>
            </Form.Row>
        )
    }
}