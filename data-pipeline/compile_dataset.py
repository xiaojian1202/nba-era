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
    
    # 3. Create Player Search Index
    player_index = []
    for p_id, p_info in player_db.items():
        seasons_played = [s["season"] for s in p_info["seasons"]]
        career_start = min(seasons_played)
        career_end = max(seasons_played)
        
        # Calculate career totals to filter out players with almost zero minutes
        total_min = sum([s["min"] for s in p_info["seasons"]])
        total_pts = sum([s["pts"] for s in p_info["seasons"]])
        
        # We can flag "stars" for prioritization in search results
        # A simple flag: averaged > 15 PPG in any season or has career points > 5000
        is_star = False
        for s in p_info["seasons"]:
            if s["gp"] > 10 and (s["pts"] / s["gp"]) >= 15.0:
                is_star = True
                break
        if total_pts > 5000:
            is_star = True
            
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
        
    print("Compilation complete!")
    print("Files generated:")
    print("  - public/data/player_index.json")
    print("  - public/data/league_baselines.json")
    print(f"  - public/data/players/ (containing {len(player_db)} individual profiles)")

if __name__ == "__main__":
    run_compilation()
