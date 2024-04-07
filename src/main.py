# Early concept of the project, using the Steam API to get the match history of a player and the details of a match.
# will be removed in the future.


import requests
import json

api_key = "DF74BEF5A6E53466FDCF32761A550338"
steam_id1 = "76561199441898894"
steam_id2 = "76561198103151062"

def is_steam_id_valid(steam_id):
    url = f"http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key={api_key}&steamids={steam_id}"
    response = requests.get(url)
    return response.json()

def get_match_id(steam_id):
    url = f"http://api.steampowered.com/IDOTA2Match_570/GetMatchHistory/V001/?key={api_key}&account_id={steam_id}&matches_requested=1"
    response = requests.get(url)
    return response.json()["result"]["matches"][0]["match_id"]

def get_match_duration(match_id):
    url = f"http://api.steampowered.com/IDOTA2Match_570/GetMatchDetails/V001/?key={api_key}&match_id={match_id}"
    response = requests.get(url)
    return response.json()["result"]["duration"]

def get_history(steam_id):
    url = f"http://api.steampowered.com/IDota2Match_570/GetMatchHistory/V001/?key={api_key}&account_id={steam_id}"
    response = requests.get(url)
    return response.json()

def get_match_details(match_id):
    url = f"http://api.steampowered.com/IDOTA2Match_570/GetMatchDetails/V001/?key={api_key}&match_id={match_id}"
    response = requests.get(url)
    return response.json()

def save_json(data):
    with open("data.json", "w") as file:
        json.dump(data, file, indent=4)

# result = get_match_id(steam_id2)
# match_duration = divmod(get_match_duration(result), 60)
# print(f"{match_duration[0]} minutes and {match_duration[1]} seconds")

# match_details = get_match_details(result)
# save_json(match_details)

# response = get_history(steam_id2)
# print(response)
# save_json(response)

result = is_steam_id_valid(steam_id1)
save_json(result)
print(result)