export const disclaimers = {
	// arcadia:
	// 	'<strong>How this series is written:</strong> Arcadia Editions is a fictional company, and its story was written mostly with AI (Claude and ChatGPT). The journey through it is mine: domain discovery, modeling, API and event governance, and every technical idea and decision along the way. AI helped with most of the words. I reviewed all of them.',
	arcadia:
		'<strong>About this series:</strong> Arcadia Editions is a fictional company. The ideas, the domain discovery, the models and the API and event governance journey are mine. Most of the storytelling and much of the wording were written with AI (Claude and ChatGPT).'
} as const;

export type DisclaimerKey = keyof typeof disclaimers;
