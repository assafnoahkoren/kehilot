import { Body, Controller, Post } from '@nestjs/common';
import {  IsNotEmpty, IsString } from 'class-validator';
import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { StructuredOutputParser } from "langchain/output_parsers";
import { z } from "zod";



class CompareFreeTextBody {
	@IsNotEmpty() @IsString()
		question: string;

	@IsNotEmpty() @IsString()
		givenAnswer: string;

	@IsNotEmpty() @IsString()
		expectedAnswer: string;
}

@Controller('ai/questions')
export class QuestionsController {
	@Post()
	async compareFreeText(@Body() body: CompareFreeTextBody) {
		
		const model = new ChatOpenAI({
			openAIApiKey: process.env.OPENAI_API_KEY,
			modelName: "gpt-4",
			temperature: 0,

		});

		const parser = StructuredOutputParser.fromZodSchema(
			z.object({
				score: z.number().describe("The score of the correctness of the answer. A value between 0 to 10."),
				note: z.string().describe("If the answer is partially correct, give a note on the data that is missing or incorrect. In Hebrew."),
				
			})
		);
		const formatInstructions = parser.getFormatInstructions();
		// console.log(formatInstructions)

		const prompt = new PromptTemplate({
			template: `
				{formatInstructions}
				remove the \`\`\`json and \`\`\` from the start and end of the JSON string.

				Question: {question}
				Given Answer: {givenAnswer}
				Expected Answer: {expectedAnswer}

				Give a score between 0 to 10 where 0 is an incorrect answer and 10 in a correct answer.
				If the answer is partially correct, give a score between 0 to 10 depending on the amount of data that is missing or incorrect.
				Be harsh, give a low score if the answer is not correct.
			`,
			inputVariables: [
				"question",
				"givenAnswer",
				"expectedAnswer",
				"formatInstructions"
			],
		
		});

		// console.log(prompt.toJSON())
		
		const input = await prompt.format({
			question: body.question,
			givenAnswer: body.givenAnswer,
			expectedAnswer: body.expectedAnswer,
			formatInstructions: formatInstructions,
		})
		
		const result = await model.invoke(input)
		const json = result.content
		
		return json;
	}
}

