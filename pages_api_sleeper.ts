import { NextApiRequest, NextApiResponse } from 'next'

const LEAGUE_ID = process.env.SLEEPER_LEAGUE_ID

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { endpoint } = req.query

  if (!endpoint || typeof endpoint !== 'string') {
    return res.status(400).json({ error: 'Invalid endpoint' })
  }

  try {
    const response = await fetch(`https://api.sleeper.app/v1/${endpoint}`)
    const data = await response.json()
    res.status(200).json(data)
  } catch (error) {
    res.status(500).json({ error: 'Error fetching data from Sleeper API' })
  }
}