import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class SendSafelyApi implements ICredentialType {
	name = 'sendSafelyApi';

	displayName = 'SendSafely API';

	documentationUrl = 'https://sendsafely.zendesk.com/hc/en-us/articles/360037927791-SendSafely-REST-API';

	properties: INodeProperties[] = [
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://app.sendsafely.com',
			placeholder: 'https://app.sendsafely.com',
			description: 'The base URL of your SendSafely instance. Use the default for SendSafely cloud, or your custom domain for enterprise instances.',
			required: true,
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			placeholder: 'your-api-key',
			description: 'The API key for your SendSafely account. Generate this from your SendSafely account settings.',
			required: true,
		},
		{
			displayName: 'API Secret',
			name: 'apiSecret',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			placeholder: 'your-api-secret',
			description: 'The API secret for your SendSafely account. This is provided when you generate your API key.',
			required: true,
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'ss-api-key': '={{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl}}',
			url: '/api/v2.0/user/',
			method: 'GET',
		},
	};
}
