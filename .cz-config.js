'use strict';

module.exports = {
	allowBreakingChanges: ['feat', 'fix'],
	allowCustomScopes: true,
	scopes: ['system'],
	types: [
		{ value: 'feat', name: 'feat:     A new feature' },
		{ value: 'fix', name: 'fix:      A bug fix' },
		{ value: 'docs', name: 'docs:     Documentation only changes' },
		{
			value: 'test',
			name: 'test:      Changes that do only concern the test cases for this project\n           withough functional impact'
		},
		{
			value: 'style',
			name: 'style:    Changes that do not affect the meaning of the code\n            (white-space, formatting, missing semi-colons, etc)'
		},
		{ value: 'refactor', name: 'refactor: A code change that neither fixes a bug nor adds a feature' },
		{ value: 'test', name: 'test:     Adding missing tests' },
		{
			value: 'chore',
			name: 'chore:    Changes to the build process or auxiliary tools\n            and libraries such as documentation generation'
		},
		{ value: 'revert', name: 'revert:   Revert to a commit' }
	]
};
