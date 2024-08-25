import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { RefreshCw, AlertCircle } from 'lucide-react'

// In a real application, you'd want to move these to a separate file
const LEAGUE_ID = 'your_league_id_here'
const CURRENT_WEEK = 1 // You'd need to determine the current week

interface Player {
  player_id: string
  full_name: string
  fantasy_positions: string[]
  team: string
}

interface PlayerStats {
  stats: {
    pts_ppr?: number
    pass_yd?: number
    rush_yd?: number
    rec_yd?: number
    td?: number
  }
}

interface LeagueUser {
  user_id: string
  display_name: string
  metadata: {
    team_name: string
  }
}

interface Roster {
  owner_id: string
  players: string[]
  starters: string[]
}

export default function Component() {
  const [playerStats, setPlayerStats] = useState<Record<string, PlayerStats>>({})
  const [players, setPlayers] = useState<Record<string, Player>>({})
  const [leagueUsers, setLeagueUsers] = useState<LeagueUser[]>([])
  const [rosters, setRosters] = useState<Roster[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      // Fetch league users
      const usersResponse = await fetch(`https://api.sleeper.app/v1/league/${LEAGUE_ID}/users`)
      const usersData: LeagueUser[] = await usersResponse.json()
      setLeagueUsers(usersData)

      // Fetch rosters
      const rostersResponse = await fetch(`https://api.sleeper.app/v1/league/${LEAGUE_ID}/rosters`)
      const rostersData: Roster[] = await rostersResponse.json()
      setRosters(rostersData)

      // Fetch player data
      const playersResponse = await fetch('https://api.sleeper.app/v1/players/nfl')
      const playersData: Record<string, Player> = await playersResponse.json()
      setPlayers(playersData)

      // Fetch stats for the current week
      const statsResponse = await fetch(`https://api.sleeper.app/v1/stats/nfl/${CURRENT_WEEK}`)
      const statsData: Record<string, PlayerStats> = await statsResponse.json()
      setPlayerStats(statsData)

      setLoading(false)
    } catch (err) {
      setError("Failed to fetch data. Please try again later.")
      setLoading(false)
    }
  }

  const getTopPerformers = () => {
    const allPlayers = rosters.flatMap(roster => roster.players)
    return allPlayers
      .map(playerId => ({
        ...players[playerId],
        stats: playerStats[playerId]?.stats || {}
      }))
      .sort((a, b) => (b.stats.pts_ppr || 0) - (a.stats.pts_ppr || 0))
      .slice(0, 5)
  }

  const getLeaderboards = () => {
    const leaderboards = {
      Points: [] as { team: string; value: number }[],
      Yards: [] as { team: string; value: number }[],
      Touchdowns: [] as { team: string; value: number }[]
    }

    rosters.forEach(roster => {
      const user = leagueUsers.find(user => user.user_id === roster.owner_id)
      if (!user) return

      let totalPoints = 0
      let totalYards = 0
      let totalTouchdowns = 0

      roster.players.forEach(playerId => {
        const stats = playerStats[playerId]?.stats || {}
        totalPoints += stats.pts_ppr || 0
        totalYards += (stats.pass_yd || 0) + (stats.rush_yd || 0) + (stats.rec_yd || 0)
        totalTouchdowns += stats.td || 0
      })

      leaderboards.Points.push({ team: user.metadata.team_name, value: totalPoints })
      leaderboards.Yards.push({ team: user.metadata.team_name, value: totalYards })
      leaderboards.Touchdowns.push({ team: user.metadata.team_name, value: totalTouchdowns })
    })

    Object.keys(leaderboards).forEach(key => {
      leaderboards[key as keyof typeof leaderboards].sort((a, b) => b.value - a.value)
    })

    return leaderboards
  }

  const topPerformers = getTopPerformers()
  const leaderboards = getLeaderboards()

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="container mx-auto p-4 space-y-4">
      <h1 className="text-3xl font-bold">Fantasy Football Dashboard</h1>
      <button onClick={fetchData} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <RefreshCw className="h-4 w-4" />
        Refresh Data
      </button>
      
      <Card>
        <CardHeader>
          <CardTitle>Top Performers This Week</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Player</TableHead>
                <TableHead>Team</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Points</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array(5).fill(0).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[50px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[50px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[50px]" /></TableCell>
                  </TableRow>
                ))
              ) : (
                topPerformers.map((player) => (
                  <TableRow key={player.player_id}>
                    <TableCell>{player.full_name}</TableCell>
                    <TableCell>{player.team}</TableCell>
                    <TableCell>{player.fantasy_positions[0]}</TableCell>
                    <TableCell>{player.stats.pts_ppr?.toFixed(2) || '0.00'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Weekly Leaderboards</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="Points">
            <TabsList>
              <TabsTrigger value="Points">Points</TabsTrigger>
              <TabsTrigger value="Yards">Yards</TabsTrigger>
              <TabsTrigger value="Touchdowns">Touchdowns</TabsTrigger>
            </TabsList>
            {Object.entries(leaderboards).map(([category, data]) => (
              <TabsContent key={category} value={category}>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rank</TableHead>
                      <TableHead>Team</TableHead>
                      <TableHead>{category}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      Array(5).fill(0).map((_, index) => (
                        <TableRow key={index}>
                          <TableCell><Skeleton className="h-4 w-[50px]" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-[50px]" /></TableCell>
                        </TableRow>
                      ))
                    ) : (
                      data.slice(0, 5).map((team, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Badge variant={index === 0 ? "default" : "secondary"}>
                              {index + 1}
                            </Badge>
                          </TableCell>
                          <TableCell>{team.team}</TableCell>
                          <TableCell>{category === 'Points' ? team.value.toFixed(2) : team.value}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}