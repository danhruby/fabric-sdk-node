/**
 * Copyright 2018, 2019 IBM All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';
const sinon = require('sinon');
const rewire = require('rewire');

const Channel = require('fabric-common/lib/Channel');
const DiscoveryService = require('fabric-common/lib/DiscoveryService');
const Endorsement = require('fabric-common/lib/Endorsement');

const chai = require('chai');
const expect = chai.expect;
chai.use(require('chai-as-promised'));
chai.should();

const Contract = rewire('../lib/contract');
const Gateway = require('../lib/gateway');
const {NetworkImpl: Network} = require('../lib/network');
const Transaction = require('../lib/transaction');

describe('Contract', () => {
	const chaincodeId = 'CHAINCODE_ID';
	const namespace = 'namespace';
	const collections = ['col1', 'col2'];

	let network;
	let channel;
	let gateway;
	let contract;
	let transaction;
	let endorsement;
	let discoveryService;

	beforeEach(() => {
		discoveryService = sinon.createStubInstance(DiscoveryService);
		discoveryService.newHandler.returns('handler');

		channel = sinon.createStubInstance(Channel);
		channel.newDiscoveryService.returns(discoveryService);

		gateway = sinon.createStubInstance(Gateway);
		gateway.identityContext = 'idx';
		gateway.getOptions.returns({
			eventHandlerOptions: 'options',
			discovery: {
				asLocalhost: true
			}
		});
		gateway.getIdentity.returns({
			mspId: 'mspId'
		});

		network = new Network(gateway, channel);

		transaction = sinon.createStubInstance(Transaction);
		transaction.submit.resolves('result');
		transaction.evaluate.resolves('result');

		endorsement = sinon.createStubInstance(Endorsement);
		endorsement.buildProposalInterest.returns('interests');

		contract = new Contract(network, chaincodeId, namespace, collections);
	});

	afterEach(() => {
		sinon.restore();
	});

	describe('#constructor', () => {
		it('throws if namespace is not a string', () => {
			(() => new Contract(network, chaincodeId, 123))
				.should.throw(/Namespace must be a non-empty string/i);
		});
	});

	describe('#createTransaction', () => {
		it('returns a transaction with only a name', () => {
			contract.namespace = undefined;
			const name = 'name';
			const result = contract.createTransaction(name);
			result.getName().should.equal(name);
		});

		it ('returns a transaction with both name and namespace', () => {

			const name = 'name';
			const result = contract.createTransaction(name);

			result.getName().should.equal('namespace:name');
		});

		it ('throws if name is an empty string', () => {
			(() => contract.createTransaction('')).should.throw('name');
		});

		it ('throws is name is not a string', () => {
			(() => contract.createTransaction(123)).should.throw('name');
		});
	});

	describe('#submitTransaction', () => {
		it('submits a transaction with supplied arguments', async () => {
			const args = ['a', 'b', 'c'];
			contract.createTransaction = sinon.stub().returns(transaction);
			const result = await contract.submitTransaction('name', ...args);
			result.should.equal('result');
		});
	});

	describe('#evaluateTransaction', () => {
		it('evaluates a transaction with supplied arguments', async () => {
			const args = ['a', 'b', 'c'];
			contract.createTransaction = sinon.stub().returns(transaction);
			const result = await contract.evaluateTransaction('name', ...args);
			result.should.equal('result');
		});
	});

	describe('#getDiscoveryHandler', () => {
		it('should run with no discovery', async () => {
			network.discoveryService = undefined;
			const handler = await contract.getDiscoveryHandler(endorsement);
			expect(handler).to.equal(null);
		});
		it('should run when discover is assigned to network and contract', async () => {
			network.discoveryService = discoveryService;
			contract.discoveryService = discoveryService;
			const handler = await contract.getDiscoveryHandler(endorsement);
			expect(handler).to.equal('handler');
		});
		it('should run when discover is assigned to network and not to contract', async () => {
			network.discoveryService = discoveryService;
			const handler = await contract.getDiscoveryHandler(endorsement);
			expect(handler).to.equal('handler');
		});
	});

	describe('#addDiscoveryInterest', () => {
		it ('throws when not an interest', () => {
			(() => contract.addDiscoveryInterest('intersts')).should.throw('"interest" parameter must be a DiscoveryInterest object');
		});
		it('add collection', async () => {
			const interest = {name: chaincodeId, collectionNames: ['c1', 'c2']};
			contract.addDiscoveryInterest(interest);
			expect(contract.discoveryInterests).to.deep.equal([
				interest
			]);
		});
		it('add chaincode', async () => {
			const other = {name: 'other'};
			contract.addDiscoveryInterest(other);
			expect(contract.discoveryInterests).to.deep.equal([
				{name: chaincodeId},
				other
			]);
		});
		it('add chaincode and collection', async () => {
			const other = {name: 'other', collectionNames: ['c1', 'c2']};
			contract.addDiscoveryInterest(other);
			expect(contract.discoveryInterests).to.deep.equal([
				{name: chaincodeId},
				other
			]);
		});
	});

	describe('#getDiscoveryInterests', () => {
		it('get default', async () => {
			contract.getDiscoveryInterests();
			expect(contract.discoveryInterests).to.deep.equal([
				{name: chaincodeId}
			]);
		});
		it('get after an add chaincode and collection', async () => {
			const other = {name: 'other', collectionNames: ['c1', 'c2']};
			contract.addDiscoveryInterest(other);
			const interests = contract.getDiscoveryInterests();
			expect(interests).to.deep.equal([
				{name: chaincodeId},
				other
			]);
		});
	});
});
