import os
import json
import time
import pandas as pd
from nba_api.stats.endpoints import leagueleaders

# We will load the official scraped paces for 1973-74 to 2025-26
# and estimate the pace for seasons before 1973-74.
OFFICIAL_PACES = {
    "2025-26": 99.4, "2024-25": 98.8, "2023-24": 98.5, "2022-23": 99.2, "2021-22": 98.2,
    "2020-21": 99.2, "2019-20": 100.3, "2018-19": 100.0, "2017-18": 97.3, "2016-17": 96.4,
    "2015-16": 95.8, "2014-15": 93.9, "2013-14": 93.9, "2012-13": 92.0, "2011-12": 91.3,
    "2010-11": 92.1, "2009-10": 92.7, "2008-09": 91.7, "2007-08": 92.4, "2006-07": 91.9,
    "2005-06": 90.5, "2004-05": 90.9, "2003-04": 90.1, "2002-03": 91.0, "2001-02": 90.7,
    "2000-01": 91.3, "1999-00": 93.1, "1998-99": 88.9, "1997-98": 90.3, "1996-97": 90.1,
    "1995-96": 91.8, "1994-95": 92.9, "1993-94": 95.1, "1992-93": 96.8, "1991-92": 96.6,
    "1990-91": 97.8, "1989-90": 98.3, "1988-89": 100.6, "1987-88": 99.6, "1986-87": 100.8,
    "1985-86": 102.1, "1984-85": 102.1, "1983-84": 101.4, "1982-83": 103.1, "1981-82": 100.9,
    "1980-81": 101.8, "1979-80": 103.1, "1978-79": 105.8, "1977-78": 106.7, "1976-77": 106.5,
    "1975-76": 105.5, "1974-75": 104.5, "1973-74": 107.8
}

def generate_seasons_list():
    seasons = []
    # From 1951-52 to 2025-26
    for year in range(1951, 2026):
        season_str = f"{year}-{str(year+1)[2:]}"
        seasons.append(season_str)
    return seasons

def run_compilation():
    seasons = generate_seasons_list()
    player_db = {}
    league_baselines = {}
    
    output_dir = "public/data/players"
    os.makedirs(output_dir, exist_ok=True)
    
    print(f"Starting compilation for {len(seasons)} seasons...")
    
    for i, season in enumerate(seasons):
        print(f"[{i+1}/{len(seasons)}] Fetching season: {season} ...")
        
        # Retry logic for network flakiness
        retries = 3
        df = None
        while retries > 0:
            try:
                leaders = leagueleaders.LeagueLeaders(season=season, per_mode48='Totals', timeout=30)
                df = leaders.get_data_frames()[0]
                break
            except Exception as e:
                print(f"  Error fetching {season}: {e}. Retrying...")
                retries -= 1
                time.sleep(3)
        
        if df is None or df.empty:
            print(f"  FAILED to fetch data for season {season}")
            continue
            
        # 1. Calculate League Averages
        # Handle cases where columns might be missing in early eras
        total_pts = int(df['PTS'].sum())
        total_fga = int(df['FGA'].sum())
        total_fta = int(df['FTA'].sum())
        total_min = int(df['MIN'].sum())
        
        total_fg3a = int(df['FG3A'].sum()) if 'FG3A' in df.columns else 0
        total_fg3m = int(df['FG3M'].sum()) if 'FG3M' in df.columns else 0
        
        # True Shooting calculation: PTS / (2 * (FGA + 0.44 * FTA))
        denom = 2 * (total_fga + 0.44 * total_fta)
        league_ts = total_pts / denom if denom > 0 else 0
        
        # 3-Point Attempt Rate (3FAr): 3PA / FGA
        league_3far = total_fg3a / total_fga if total_fga > 0 else 0
        
        # Pace calculation
        if season in OFFICIAL_PACES:
            league_pace = OFFICIAL_PACES[season]
        else:
            # Estimate pace for pre-1973 seasons using:
            # 240 * (FGA + 0.44 * FTA) / Total minutes
            # Since 5 players are on the court, total possessions in the league is (FGA + 0.44 * FTA)
            # and total minutes is the sum of MIN of all players.
            # Pace = possessions per 48 minutes per team = (Possessions / (Total Minutes / 5)) * 48
            # = (Possessions / Total Minutes) * 240
            possessions = total_fga + 0.44 * total_fta
            league_pace = (possessions / total_min) * 240 if total_min > 0 else 0
            # Round to 1 decimal place
            league_pace = round(league_pace, 1)
            
        league_baselines[season] = {
            "season": season,
            "league_pace": league_pace,
            "league_ts_pct": round(league_ts, 4),
            "league_fg3a_per_fga": round(league_3far, 4),
            "total_pts": total_pts,
            "total_fga": total_fga,
            "total_fta": total_fta
        }
        
        print(f"  Baselines -> Pace: {league_pace}, TS%: {round(league_ts*100, 2)}%, 3FAr: {round(league_3far*100, 2)}%")
        
        # 2. Extract Player Statistics
        # We fill missing stats with 0 for older eras
        columns_to_extract = [
            'PLAYER_ID', 'PLAYER', 'TEAM', 'GP', 'MIN', 'PTS', 'REB', 'AST', 
            'STL', 'BLK', 'TOV', 'PF', 'FGM', 'FGA', 'FG3M', 'FG3A', 'FTM', 'FTA'
        ]
        
        for _, row in df.iterrows():
            p_id = int(row['PLAYER_ID'])
            p_name = row['PLAYER']
            
            p_stats = {
                "season": season,
                "team": row['TEAM'],
                "gp": int(row['GP']),
                "min": float(row['MIN']),
                "pts": int(row['PTS']),
                "reb": int(row['REB']),
                "ast": int(row['AST']),
                "stl": int(row.get('STL', 0)) if pd.notna(row.get('STL')) else 0,
                "blk": int(row.get('BLK', 0)) if pd.notna(row.get('BLK')) else 0,
                "tov": int(row.get('TOV', 0)) if pd.notna(row.get('TOV')) else 0,
                "pf": int(row['PF']),
                "fgm": int(row['FGM']),
                "fga": int(row['FGA']),
                "fg3m": int(row.get('FG3M', 0)) if pd.notna(row.get('FG3M')) else 0,
                "fg3a": int(row.get('FG3A', 0)) if pd.notna(row.get('FG3A')) else 0,
                "ftm": int(row['FTM']),
                "fta": int(row['FTA'])
            }
            
            if p_id not in player_db:
                player_db[p_id] = {
                    "id": p_id,
                    "name": p_name,
                    "seasons": []
                }
            
            player_db[p_id]["seasons"].append(p_stats)
            
        # Throttling to respect NBA.com server limits
        time.sleep(1.5)
        
    print(f"\nFetched all seasons. Total unique players: {len(player_db)}")
    
    # 3. Collect Definitive NBA All-Star & All-NBA Player Set
    print("\nCompiling NBA All-Star & All-NBA player honors...")
    star_names_norm, star_aliases, normalize_fn = fetch_all_star_and_all_nba_players()
    print(f"Total historical All-Star/All-NBA player identities: {len(star_names_norm)}")

    # 4. Create Player Search Index
    player_index = []
    star_count = 0
    for p_id, p_info in player_db.items():
        seasons_played = [s["season"] for s in p_info["seasons"]]
        career_start = min(seasons_played)
        career_end = max(seasons_played)
        
        # Calculate career totals
        total_min = sum([s["min"] for s in p_info["seasons"]])
        total_pts = sum([s["pts"] for s in p_info["seasons"]])
        
        # A player is defined as a Star Player ONLY if they have an NBA All-Star or All-NBA appearance
        p_norm = normalize_fn(p_info["name"])
        is_star = p_norm in star_names_norm or star_aliases.get(p_norm, p_norm) in star_names_norm
        if is_star:
            star_count += 1
            
        player_index.append({
            "id": p_id,
            "name": p_info["name"],
            "start": career_start,
            "end": career_end,
            "total_pts": total_pts,
            "total_min": total_min,
            "is_star": is_star
        })
        
        # Save individual player JSON
        player_file = os.path.join(output_dir, f"{p_id}.json")
        with open(player_file, "w") as f:
            json.dump(p_info, f, indent=2)
            
    # Save player search index
    # We sort the search index alphabetically by player name
    player_index.sort(key=lambda x: x["name"])
    with open("public/data/player_index.json", "w") as f:
        json.dump(player_index, f, indent=2)
        
    # Save league baselines
    with open("public/data/league_baselines.json", "w") as f:
        json.dump(league_baselines, f, indent=2)
        
    print(f"Compilation complete! Flagged {star_count} All-Star / All-NBA star players.")
    print("Files generated:")
    print("  - public/data/player_index.json")
    print("  - public/data/league_baselines.json")
    print(f"  - public/data/players/ (containing {len(player_db)} individual profiles)")

def fetch_all_star_and_all_nba_players():
    """
    Collects the definitive set of all players in NBA history who have earned
    at least one NBA All-Star or All-NBA Team selection.
    """
    import urllib.request
    import unicodedata
    import re
    from bs4 import BeautifulSoup

    def norm(name):
        name = unicodedata.normalize('NFKD', name).encode('ASCII', 'ignore').decode('utf-8')
        name = re.sub(r'\[.*?\]|\*|\^|\#|\†|\!|\.', '', name)
        name = name.replace("'", "").replace("-", " ").replace("Jr", "").replace("Sr", "").replace("III", "").replace("II", "").replace("IV", "")
        return ' '.join(name.lower().split())

    headers = {'User-Agent': 'Mozilla/5.0'}
    all_stars = set()
    all_nba = set()

    try:
        # 1. Fetch All-Stars
        req = urllib.request.Request('https://en.wikipedia.org/wiki/List_of_NBA_All-Stars', headers=headers)
        html = urllib.request.urlopen(req, timeout=15).read().decode('utf-8')
        soup = BeautifulSoup(html, 'html.parser')
        wikitables = soup.find_all('table', {'class': 'wikitable'})
        if len(wikitables) > 1:
            for r in wikitables[1].find_all('tr')[1:]:
                cols = r.find_all(['td', 'th'])
                if cols:
                    name = cols[0].text.strip()
                    clean = re.sub(r'\[.*?\]|\*|\^|\#|\†|\!', '', name).strip()
                    if clean and clean != 'Player':
                        all_stars.add(clean)

        # 2. Fetch All-NBA
        req2 = urllib.request.Request('https://en.wikipedia.org/wiki/All-NBA_Team', headers=headers)
        html2 = urllib.request.urlopen(req2, timeout=15).read().decode('utf-8')
        soup2 = BeautifulSoup(html2, 'html.parser')
        tables = soup2.find_all('table')
        NON_PLAYERS = {'seattle supersonics', 'indianapolis olympians', 'providence steamrollers', 'first team', 'second team', 'third team'}
        for t_idx in [2, 3, 4, 5]:
            if t_idx < len(tables):
                for r in tables[t_idx].find_all('tr'):
                    for a in r.find_all('a'):
                        href = a.get('href', '')
                        text = a.text.strip()
                        if not href: continue
                        if any(x in href for x in ['season', 'United_States', 'Basketball_positions', 'cite_note', 'Team', 'Conference', 'Division', 'National_Basketball_Association']): continue
                        clean = re.sub(r'\[.*?\]|\*|\^|\#|\†|\!', '', text).strip()
                        if len(clean) > 3 and ' ' in clean and clean.lower() not in NON_PLAYERS:
                            all_nba.add(clean)
    except Exception as e:
        print(f"Warning: Could not dynamically fetch All-Star/All-NBA list: {e}")

    ALIASES = {
        norm('Akeem Olajuwon'): norm('Hakeem Olajuwon'),
        norm('Fat Lever'): norm('Lafayette Lever'),
        norm('Ron Artest'): norm('Metta World Peace'),
        norm('World B. Free'): norm('World B Free'),
        norm('Lloyd Free'): norm('World B Free'),
        norm('Lew Alcindor'): norm('Kareem Abdul Jabbar'),
        norm('Predrag Stojakovic'): norm('Peja Stojakovic'),
        norm('Nene Hilario'): norm('Nene'),
        norm('Clifford Robinson'): norm('Cliff Robinson'),
        norm('Jeffrey Hornacek'): norm('Jeff Hornacek'),
        norm('Guice McGowan'): norm('Leo Mogus'),
        norm('B.J. Armstrong'): norm('BJ Armstrong'),
    }

    star_names_norm = set()
    for name in all_stars.union(all_nba):
        n = norm(name)
        star_names_norm.add(ALIASES.get(n, n))

    return star_names_norm, ALIASES, norm

if __name__ == "__main__":
    run_compilation()

