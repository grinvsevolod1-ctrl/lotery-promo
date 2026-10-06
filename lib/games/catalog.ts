import type { ShowcaseGame } from "@/lib/games/showcase"
import { UNIQUE_COVERS } from "@/lib/games/covers"

const THEMES = {
  candy: "#d94a9a",
  olympus: "#2a2a7a",
  egypt: "#8a5a1a",
  ocean: "#1f6a8a",
  western: "#7a3a14",
  fruit: "#c04a1a",
  asian: "#9a1a1a",
  irish: "#2a7a2a",
  viking: "#3a4a5a",
  jungle: "#2a5a2a",
  space: "#2a1a5a",
  horror: "#3a1a2a",
  animals: "#6a4a1a",
  roulette: "#5a1a1a",
  cards: "#1a4a3a",
  show: "#8a2a7a",
} as const

type Theme = keyof typeof THEMES

// "Title|Provider|theme|rtp|n" — the trailing "n" marks a new release.
const SLOT_ROWS = `
Gates of Olympus Super Scatter|Pragmatic Play|olympus|96.5|n
Sweet Bonanza Super Scatter|Pragmatic Play|candy|96.5|n
Sugar Rush Super Scatter|Pragmatic Play|candy|96.5|n
Fortune of Olympus|Pragmatic Play|olympus|96.55|n
Wisdom of Athena 1000|Pragmatic Play|olympus|96.5|n
Starlight Princess Pachi|Pragmatic Play|space|96.5|n
Sugar Supreme Powernudge|Pragmatic Play|candy|96.53|n
Candy Blitz Bombs|Pragmatic Play|candy|96.5|n
Gates of Hades|Pragmatic Play|horror|96.5|n
Big Bass Christmas Bash|Pragmatic Play|ocean|96.07|n
Gates of Olympus|Pragmatic Play|olympus|96.5
Sweet Bonanza|Pragmatic Play|candy|96.48
Sugar Rush|Pragmatic Play|candy|96.5
Wisdom of Athena|Pragmatic Play|olympus|96.5
Big Bass Splash|Pragmatic Play|ocean|96.71
Big Bass Bonanza Megaways|Pragmatic Play|ocean|96.7
Big Bass Hold & Spinner|Pragmatic Play|ocean|96.07
Big Bass Amazon Xtreme|Pragmatic Play|jungle|96.07
Big Bass Floats My Boat|Pragmatic Play|ocean|96.07
Fishin' Reels|Pragmatic Play|ocean|96.5
Release the Kraken|Pragmatic Play|ocean|96.5
The Dog House Megaways|Pragmatic Play|animals|96.55
The Dog House Multihold|Pragmatic Play|animals|96.06
Wolf Gold|Pragmatic Play|animals|96.01
Buffalo King Megaways|Pragmatic Play|animals|96.52
Great Rhino Megaways|Pragmatic Play|animals|96.58
Mustang Gold|Pragmatic Play|animals|96.53
Gems Bonanza|Pragmatic Play|jungle|96.51
Aztec Gems|Pragmatic Play|jungle|96.52
Wild West Gold|Pragmatic Play|western|96.51
Wild West Gold Megaways|Pragmatic Play|western|96.5
Cowboys Gold|Pragmatic Play|western|96.5
Madame Destiny Megaways|Pragmatic Play|horror|96.56
Curse of the Werewolf Megaways|Pragmatic Play|horror|96.5
Muertos Multiplier Megaways|Pragmatic Play|horror|96.6
Fire Portals|Pragmatic Play|horror|96.06
Fruit Party 2|Pragmatic Play|fruit|96.53
Juicy Fruits|Pragmatic Play|fruit|96.52
Extra Juicy|Pragmatic Play|fruit|96.52
Hot Fiesta|Pragmatic Play|fruit|96.56
Joker's Jewels|Pragmatic Play|fruit|96.5
Chilli Heat|Pragmatic Play|fruit|96.52
Wild Wild Riches|Pragmatic Play|irish|96.77
Floating Dragon|Pragmatic Play|asian|96.71
Floating Dragon Megaways|Pragmatic Play|asian|96.5
5 Lions Megaways|Pragmatic Play|asian|96.5
Caishen's Gold|Pragmatic Play|asian|96.5
Mahjong Wins|Pragmatic Play|asian|96.5
Power of Thor Megaways|Pragmatic Play|viking|96.55
Book of Vikings|Pragmatic Play|viking|96.5
Spaceman|Pragmatic Play|space|96.5
Rocket Blast Megaways|Pragmatic Play|space|96.5
Pyramid Bonanza|Pragmatic Play|egypt|96.5
John Hunter and the Tomb of the Scarab Queen|Pragmatic Play|egypt|96.5
Le Pharaoh|Hacksaw Gaming|egypt|96.21|n
Le Viking|Hacksaw Gaming|viking|96.3|n
Le King|Hacksaw Gaming|western|96.3|n
Chaos Crew 3|Hacksaw Gaming|horror|96.3|n
Beam Boys|Hacksaw Gaming|space|96.3|n
Danny Dollar|Hacksaw Gaming|western|96.3|n
Chaos Crew 2|Hacksaw Gaming|horror|96.3
Hand of Anubis|Hacksaw Gaming|egypt|96.24
Duel at Dawn|Hacksaw Gaming|western|96.31
Rotten|Hacksaw Gaming|horror|96.3
Stick'em|Hacksaw Gaming|western|96.3
Dork Unit|Hacksaw Gaming|horror|96.3
Itero|Hacksaw Gaming|space|96.3
Cubes 2|Hacksaw Gaming|space|96.3
Joker Bombs|Hacksaw Gaming|fruit|96.3
Mayan Stackways|Hacksaw Gaming|jungle|96.3
RIP City|Hacksaw Gaming|horror|96.3
Xpander|Hacksaw Gaming|space|96.3
Stormforged|Hacksaw Gaming|viking|96.3
Mental 2|Nolimit City|horror|96.08|n
Fire in the Hole 3|Nolimit City|western|96.06|n
Mental|Nolimit City|horror|96.08
San Quentin xWays|Nolimit City|horror|96.03
Tombstone RIP|Nolimit City|western|96.08
Fire in the Hole xBomb|Nolimit City|western|96.06
Punk Toilet|Nolimit City|horror|96.05
Deadwood|Nolimit City|western|96.03
Misery Mining|Nolimit City|western|96.08
Book of Shadows|Nolimit City|horror|96.03
Tombstone|Nolimit City|western|96.03
Das xBoot|Nolimit City|ocean|96.03
Infectious 5 xWays|Nolimit City|horror|96.08
Remember Gulag|Nolimit City|horror|96.03
Serial|Nolimit City|horror|96.03
Duck Hunters|Nolimit City|animals|96.03
Kenneth Must Die|Nolimit City|horror|96.03
Brute Force|Nolimit City|viking|96.03
Gaelic Gold|Nolimit City|irish|96.03
Rise of Olympus 100|Play'n GO|olympus|96.5|n
Rise of Olympus|Play'n GO|olympus|96.5
Legacy of Dead|Play'n GO|egypt|96.58
Rich Wilde and the Tome of Madness|Play'n GO|horror|96.59
Reactoonz|Play'n GO|space|96.51
Reactoonz 2|Play'n GO|space|96.2
Moon Princess|Play'n GO|space|96.5
Fire Joker|Play'n GO|fruit|96.15
Gemix|Play'n GO|jungle|96.75
Viking Runecraft|Play'n GO|viking|96.7
Rise of Merlin|Play'n GO|horror|96.58
Pimped|Play'n GO|fruit|96.53
Raging Rex|Play'n GO|jungle|96.06
Cat Wilde and the Doom of Dead|Play'n GO|egypt|96.4
Starburst XXXtreme|NetEnt|space|96.26
Starburst|NetEnt|space|96.09
Gonzo's Quest|NetEnt|jungle|95.97
Gonzo's Quest Megaways|NetEnt|jungle|96
Dead or Alive 2|NetEnt|western|96.8
Divine Fortune|NetEnt|olympus|96.59
Twin Spin|NetEnt|fruit|96.6
Jack and the Beanstalk|NetEnt|jungle|96.3
Blood Suckers|NetEnt|horror|98
Mega Fortune|NetEnt|fruit|96.6
Finn and the Swirly Spin|NetEnt|irish|96.6
Narcos|NetEnt|jungle|96.23
Vikings|NetEnt|viking|96.05
Space Wars|NetEnt|space|97.02
Jammin' Jars 2|Push Gaming|fruit|96.4
Jammin' Jars|Push Gaming|fruit|96.83
Razor Returns|Push Gaming|ocean|96.55
Razor Shark|Push Gaming|ocean|96.7
Fat Rabbit|Push Gaming|animals|96.45
Big Bamboo|Push Gaming|asian|96.08
Retro Tapes|Push Gaming|space|96.48
Wild Swarm|Push Gaming|jungle|97
Mount Magmas|Push Gaming|jungle|96.49
Fat Banker|Push Gaming|western|96.45
Money Train 3|Relax Gaming|western|96.1
Money Train 2|Relax Gaming|western|96.4
Temple Tumble|Relax Gaming|jungle|96.25
Iron Bank|Relax Gaming|western|96.2
Dead Man's Trail|Relax Gaming|western|96.13
Snake Arena|Relax Gaming|jungle|96.15
Book of 99|Relax Gaming|egypt|99
Hellcatraz|Relax Gaming|horror|96.46
Bonanza Megaways|Big Time Gaming|western|96
Extra Chilli|Big Time Gaming|fruit|96.82
White Rabbit|Big Time Gaming|animals|97.24
Danger High Voltage|Big Time Gaming|horror|95.67
Lil Devil|Big Time Gaming|horror|96.31
Who Wants to Be a Millionaire|Big Time Gaming|show|96.6
Queen of Riches|Big Time Gaming|egypt|96.2
Pirots 3|ELK Studios|space|94|n
Pirots 2|ELK Studios|space|94
Pirots|ELK Studios|space|94
Wild Toro|ELK Studios|animals|96.4
Cygnus|ELK Studios|space|94
Ecuador Gold|ELK Studios|jungle|94
Esqueleto Explosivo 2|Thunderkick|horror|96.1
Pink Elephants 2|Thunderkick|animals|96.2
Midas Golden Touch|Thunderkick|olympus|96.1
Vikings Go Berzerk|Yggdrasil|viking|96.1
Valley of the Gods|Yggdrasil|egypt|96.2
Holmes and the Stolen Stones|Yggdrasil|horror|96.2
Big Bad Wolf|Quickspin|animals|97.34
Sakura Fortune|Quickspin|asian|96.58
Sticky Bandits|Quickspin|western|96.6
Dragon's Fire|Red Tiger|asian|95.73
Pirates' Plenty|Red Tiger|ocean|95.7
Mystery Reels|Red Tiger|fruit|95.7
Primate King|Red Tiger|jungle|95.64
Rainbow Jackpots|Red Tiger|irish|95.12
Immortal Romance|Microgaming|horror|96.86
Thunderstruck II|Microgaming|viking|96.65
Mega Moolah|Microgaming|animals|88.12
9 Masks of Fire|Microgaming|jungle|96.24
Break da Bank Again|Microgaming|fruit|95.43
Age of the Gods|Playtech|olympus|95.02
Buffalo Blitz|Playtech|animals|95.96
Great Blue|Playtech|ocean|96.03
Elvis Frog in Vegas|BGaming|animals|96
Aztec Magic|BGaming|jungle|97.6
Lucky Lady Moon|BGaming|space|97.1
Bonanza Billion|BGaming|fruit|97
Johnny Cash|BGaming|western|97.3
Space XY|BGaming|space|97
Fortune Dragon|PG Soft|asian|96.74|n
Fortune Tiger|PG Soft|asian|96.81
Fortune Ox|PG Soft|asian|96.75
Fortune Rabbit|PG Soft|asian|96.75
Fortune Mouse|PG Soft|asian|96.96
Mahjong Ways|PG Soft|asian|96.92
Mahjong Ways 2|PG Soft|asian|96.95
Treasures of Aztec|PG Soft|jungle|96.71
Lucky Neko|PG Soft|asian|96.73
Ganesha Gold|PG Soft|asian|96.08
Caishen Wins|PG Soft|asian|96.92
Dragon Hatch|PG Soft|asian|96.83
Leprechaun Riches|PG Soft|irish|97.35
Asgardian Rising|PG Soft|viking|96.69
Cocktail Nights|PG Soft|fruit|96.77
Ways of the Qilin|PG Soft|asian|96.69
Aviator|Spribe|space|97
Mines|Spribe|cards|97
Goal|Spribe|show|97
JetX|SmartSoft|space|97
Sun of Egypt 3|3 Oaks|egypt|95.4
Sun of Egypt 2|Booongo|egypt|95.67
15 Dragon Pearls|Booongo|asian|95.6
Black Wolf|Booongo|animals|95.6
Lucky Streak 3|Endorphina|fruit|96
Hell Hot 100|Endorphina|fruit|96
Hot Hot Fruit|Habanero|fruit|96.74
Koi Gate|Habanero|asian|97.97
Book of Ra Deluxe|Novomatic|egypt|95.1
Lucky Lady's Charm Deluxe|Novomatic|irish|95.13
Sizzling Hot Deluxe|Novomatic|fruit|95.66
Crazy Monkey|Igrosoft|jungle|95
Fruit Cocktail|Igrosoft|fruit|95
`

const LIVE_ROWS = `
Lightning Storm|Evolution|show|96.2|n
Red Door Roulette|Evolution|roulette|97.3|n
Stock Market|Evolution|show|97.04|n
Ice Fishing|Evolution|show|96.4|n
XXXtreme Lightning Roulette|Evolution|roulette|97.1
Immersive Roulette|Evolution|roulette|97.3
Auto-Roulette|Evolution|roulette|97.3
Crazy Pachinko|Evolution|show|96.11
Gonzo's Treasure Map|Evolution|show|96.56
Mega Ball|Evolution|show|95.4
Deal or No Deal|Evolution|show|95.42
Cash or Crash|Evolution|show|99.59
Monopoly Big Baller|Evolution|show|96.1
Lightning Dice|Evolution|show|96.21
Lightning Sic Bo|Evolution|show|95.84
Super Sic Bo|Evolution|show|97.22
Football Studio|Evolution|cards|96.27
Lightning Blackjack|Evolution|cards|99.56
Infinite Blackjack|Evolution|cards|99.51
Power Blackjack|Evolution|cards|98.8
Lightning Baccarat|Evolution|cards|98.76
Golden Wealth Baccarat|Evolution|cards|98.76
Dragon Tiger|Evolution|cards|96.27
Casino Hold'em|Evolution|cards|97.84
Side Bet City|Evolution|cards|96.18
Treasure Island|Pragmatic Play|show|96.5|n
PowerUP Roulette|Pragmatic Play|roulette|97.3
Auto Mega Roulette|Pragmatic Play|roulette|97.3
Mega Sic Bo|Pragmatic Play|show|97.2
ONE Blackjack|Pragmatic Play|cards|99.55
Boom City|Pragmatic Play|show|96.5
Snakes & Ladders Live|Pragmatic Play|show|96.5
Ultimate Roulette|Ezugi|roulette|97.3
Andar Bahar|Ezugi|cards|97.85
Teen Patti|Ezugi|cards|96.63
Quantum Roulette|Playtech|roulette|97.3
Adventures Beyond Wonderland|Playtech|show|96.92
Spin a Win|Playtech|show|95.5
`

function slug(title: string) {
  return title
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

function hueFor(id: string) {
  let hash = 0
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) | 0
  return (Math.abs(hash) % 51) - 25
}

function parse(rows: string): ShowcaseGame[] {
  return rows
    .trim()
    .split("\n")
    .map((line) => {
      const [title, provider, theme, rtp, flag] = line.split("|")
      const id = slug(title)
      return {
        id,
        title,
        provider,
        cover: UNIQUE_COVERS.has(id) ? `/games/covers/${id}.webp` : `/games/themes/${theme}.webp`,
        tint: THEMES[theme as Theme],
        rtp: Number(rtp),
        hue: hueFor(id),
        isNew: flag === "n",
      }
    })
}

export const CATALOG_SLOTS = parse(SLOT_ROWS)
export const CATALOG_LIVE = parse(LIVE_ROWS)
