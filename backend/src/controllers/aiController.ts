import { Request, Response } from 'express';
import { generateAgentRouterCompletion } from '../services/agentRouterService';

export const askAiTutor = async (req: Request, res: Response): Promise<void> => {
  try {
    const { prompt, context } = req.body;
    if (!prompt) {
      res.status(400).json({ message: 'Prompt is required' });
      return;
    }

    const aiResponse = await generateAgentRouterCompletion(prompt, context);
    res.json({ response: aiResponse });
  } catch (error) {
    console.error('Error in askAiTutor controller:', error);
    res.status(500).json({ message: 'Error processing AI tutor request' });
  }
};
