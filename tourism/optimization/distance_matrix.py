import osmnx as ox
import networkx as nx
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
import gridfs
from pymongo import MongoClient
import random 
import math 
from itertools import permutations 
from bson import ObjectId
import tempfile
import pickle
from io import BytesIO

ox.settings.use_cache = True
ox.settings.log_console = False

client = MongoClient("mongodb://localhost:27017/")
db = client["server_db"]
fs = gridfs.GridFS(db)
map_graph_ml_collection = db["map_graph_ml"]

class DistanceMatrix:
    def __init__(self, data):
        self.data = data
        self.graph = self.load_graphml_pickle()
        self.distance_matrix = None
        self.time_matrix = None

    def load_graphml(self):
        # Fetch the latest graphml file for the specified country and province
        record = map_graph_ml_collection.find_one(
            {"province": "all", "file_type": "graphml"},
            sort=[("created_at", -1)]
        )

        if not record:
            raise ValueError("No graphml file found for the specified country and province.")
        
        file_id = record['graphml_file_id']

        file_obj = fs.get(ObjectId(file_id))

        with tempfile.NamedTemporaryFile(delete=False, suffix=".graphml") as temp_file:
            temp_file.write(file_obj.read())
            temp_file_path = temp_file.name

        G = ox.load_graphml(temp_file_path)

        print(f"Graph loaded with {len(G.nodes)} nodes and {len(G.edges)} edges.")

        return G
    
    def load_graphml_pickle(self):
        # Fetch the latest graphml file for the specified country and province
        record = map_graph_ml_collection.find_one(
            {"province": "all", "file_type": "pickle"},
            sort=[("created_at", -1)]
        )

        if not record:
            raise ValueError("No graphml file found for the specified country and province.")
        
        file_id = record['graphml_file_id']

        file_obj = fs.get(ObjectId(file_id))

        graph_data = BytesIO(file_obj.read())
        G = pickle.load(graph_data)

        print(f"Graph loaded with {len(G.nodes)} nodes and {len(G.edges)} edges.")
        return G


    def parsing_data(self):
        # Parse hotels
        hotels = []
        for hotel in self.data['hotels']['bookings']:
            hotels.append({
                'id': hotel['hotel_id'][:10],  # Shortened ID
                'name': hotel['hotel_name'],
                'coords': tuple(reversed(hotel['hotel_coordinates'])),  # (lat, lon)
                'days': hotel['days']
            })

        # Parse attractions
        attractions = []
        for attr in self.data['attractions']['selections']:
            attractions.append({
                'id': attr['attraction_id'],
                'name': attr['attraction_name'],
                'coords': tuple(reversed(attr['attraction_coordinates'])),  # (lat, lon)
                'duration': attr['attraction_hours']
            })

        # Parse schedule
        start_dt = datetime.strptime(
            f"{self.data['schedule']['start_date']} {self.data['schedule']['start_time']}",
            "%Y-%m-%d %H:%M"
        )
        end_dt = datetime.strptime(
            f"{self.data['schedule']['end_date']} {self.data['schedule']['end_time']}",
            "%Y-%m-%d %H:%M"
        )

        total_days = self.data['schedule']['duration_days']

        # Calculate daily available hours
        # First day: from start_time to midnight
        # Middle days: full 24 hours minus sleep/rest (assume 14 hours available)
        # Last day: from midnight to end_time

        first_day_hours = (24 - start_dt.hour) + (start_dt.minute / 60)
        last_day_hours = end_dt.hour + (end_dt.minute / 60)
        middle_day_hours = 14  # Assume 14 active hours per full day

        daily_hours = []
        for day in range(total_days):
            if day == 0:
                daily_hours.append(min(first_day_hours, middle_day_hours))
            elif day == total_days - 1:
                daily_hours.append(min(last_day_hours, middle_day_hours))
            else:
                daily_hours.append(middle_day_hours)

        schedule = {
            'start_date': start_dt,
            'end_date': end_dt,
            'total_days': total_days,
            'daily_hours': daily_hours
        }

        return hotels, attractions, schedule, daily_hours
    
    def assign_hotels_to_days(self, hotels):
        day_hotels = {}
        current_day = 0

        for hotel in hotels:
            for i in range(hotel['days']):
                day_hotels[current_day] = hotel
                current_day += 1

        return day_hotels
    
    def get_road_network(self):
        # Ensure the graph is in the correct format
        return self.graph

    def find_nearest_node(self, G, locations_dict):
        nearest_nodes = {}
        for loc_id, coords in locations_dict.items():
            try:
                node = ox.distance.nearest_nodes(G, coords[1], coords[0])
                nearest_nodes[loc_id] = node
            except Exception as e:
                print(f"Warning: Could not find node for {loc_id}: {e}")
                nearest_nodes[loc_id] = None

        return nearest_nodes
    
    def compute_matrices(self, G, nearest_nodes, locations_dict, avg_speed_kmh = 50):
        location_ids = list(locations_dict.keys())
        distance_matrix = {loc_id: {} for loc_id in location_ids}
        path_matrix = {loc_id: {} for loc_id in location_ids}

        print(f"Calculating distance matrix for {len(location_ids)} locations...")

        for i, origin_id in enumerate(location_ids):
            if nearest_nodes[origin_id] is None:
                continue

            # Calculate shortest paths from origin to all destinations
            try:
                lengths = nx.single_source_dijkstra_path_length(
                    G, nearest_nodes[origin_id], weight='length'
                )
                paths = nx.single_source_dijkstra_path(
                    G, nearest_nodes[origin_id], weight='length'
                )
            except Exception as e:
                print(f"Warning: Could not calculate paths from {origin_id}: {e}")
                continue

            for dest_id in location_ids:
                if origin_id == dest_id:
                    distance_matrix[origin_id][dest_id] = 0
                    path_matrix[origin_id][dest_id] = []
                elif nearest_nodes[dest_id] is None:
                    distance_matrix[origin_id][dest_id] = float('inf')
                    path_matrix[origin_id][dest_id] = []
                else:
                    try:
                        dest_node = nearest_nodes[dest_id]
                        path_length_m = lengths.get(dest_node, float('inf'))

                        if path_length_m == float('inf'):
                            distance_matrix[origin_id][dest_id] = float('inf')
                            path_matrix[origin_id][dest_id] = []
                        else:
                            # Convert to hours
                            travel_time_hours = (path_length_m / 1000) / avg_speed_kmh
                            distance_matrix[origin_id][dest_id] = travel_time_hours
                            path_matrix[origin_id][dest_id] = paths.get(dest_node, [])

                    except Exception as e:
                        distance_matrix[origin_id][dest_id] = float('inf')
                        path_matrix[origin_id][dest_id] = []

            if (i + 1) % 3 == 0:
                print(f"  Processed {i + 1}/{len(location_ids)} locations")

        print("Distance matrix calculation complete!")
        return distance_matrix, path_matrix
    

    # ============================================================================
    # STEP 3: ATTRACTION CLUSTERING FOR MULTI-DAY ASSIGNMENT
    # ============================================================================

    def cluster_attractions_by_days(self, attractions, hotels, day_hotels, distance_matrix, daily_hours):
        """
        Cluster attractions into daily groups based on hotel locations
        Uses k-means-like approach with hotel locations as centroids

        Returns:
            daily_assignments: Dict mapping day -> list of attraction IDs
        """
        total_days = len(daily_hours)

        # Simple greedy assignment: assign each attraction to closest hotel's day
        attraction_to_day = {}

        for attr in attractions:
            attr_id = attr['id']
            min_dist = float('inf')
            best_day = 0

            # Find closest hotel
            for day in range(total_days):
                hotel = day_hotels[day]
                hotel_id = hotel['id']

                if hotel_id in distance_matrix and attr_id in distance_matrix[hotel_id]:
                    dist = distance_matrix[hotel_id][attr_id]
                    if dist < min_dist:
                        min_dist = dist
                        best_day = day

            attraction_to_day[attr_id] = best_day

        # Group by day
        daily_assignments = {day: [] for day in range(total_days)}
        for attr_id, day in attraction_to_day.items():
            daily_assignments[day].append(attr_id)

        return daily_assignments


    def balance_daily_workload(self, attractions, daily_assignments, daily_hours, visit_durations):
        """
        Balance attraction assignments to avoid overloading any single day
        Uses greedy reassignment based on time constraints
        """
        total_days = len(daily_hours)

        # Calculate current daily loads
        def calculate_day_load(day):
            return sum(visit_durations.get(attr_id, 0) for attr_id in daily_assignments[day])

        # Iteratively move attractions from overloaded to underloaded days
        max_iterations = 50
        for iteration in range(max_iterations):
            day_loads = {day: calculate_day_load(day) for day in range(total_days)}

            # Find overloaded and underloaded days
            overloaded = [day for day in range(total_days) if day_loads[day] > daily_hours[day]]
            underloaded = [day for day in range(total_days) if day_loads[day] < daily_hours[day]]

            if not overloaded:
                break

            # Try to move one attraction from overloaded to underloaded
            moved = False
            for over_day in overloaded:
                for under_day in underloaded:
                    if daily_assignments[over_day]:
                        # Move smallest attraction
                        attr_id = min(daily_assignments[over_day],
                                    key=lambda x: visit_durations.get(x, 0))
                        attr_duration = visit_durations.get(attr_id, 0)

                        if day_loads[under_day] + attr_duration <= daily_hours[under_day]:
                            daily_assignments[over_day].remove(attr_id)
                            daily_assignments[under_day].append(attr_id)
                            moved = True
                            break
                if moved:
                    break

            if not moved:
                break

        return daily_assignments
    

    # ============================================================================
    # STEP 4: SINGLE-DAY ROUTE OPTIMIZATION (TSP)
    # ============================================================================

    def nearest_neighbor_tsp(self, distance_matrix, start_location, locations_to_visit):
        """
        Nearest Neighbor heuristic for single-day TSP
        """
        if not locations_to_visit:
            return [start_location, start_location], 0

        route = [start_location]
        unvisited = set(locations_to_visit)
        current = start_location
        total_time = 0

        while unvisited:
            nearest = min(unvisited, key=lambda x: distance_matrix.get(current, {}).get(x, float('inf')))
            travel_time = distance_matrix.get(current, {}).get(nearest, float('inf'))

            if travel_time == float('inf'):
                # Can't reach, skip
                unvisited.remove(nearest)
                continue

            route.append(nearest)
            total_time += travel_time
            current = nearest
            unvisited.remove(nearest)

        # Return to start
        route.append(start_location)
        total_time += distance_matrix.get(current, {}).get(start_location, 0)

        return route, total_time


    def two_opt_improvement(self, route, distance_matrix):
        """
        2-opt local search improvement
        """
        improved = True
        best_route = route[:]

        while improved:
            improved = False

            for i in range(1, len(best_route) - 2):
                for j in range(i + 1, len(best_route) - 1):
                    # Current edges: (i-1, i) and (j, j+1)
                    # New edges: (i-1, j) and (i, j+1)

                    current_dist = (
                        distance_matrix.get(best_route[i-1], {}).get(best_route[i], 0) +
                        distance_matrix.get(best_route[j], {}).get(best_route[j+1], 0)
                    )

                    new_dist = (
                        distance_matrix.get(best_route[i-1], {}).get(best_route[j], 0) +
                        distance_matrix.get(best_route[i], {}).get(best_route[j+1], 0)
                    )

                    if new_dist < current_dist:
                        # Reverse the segment between i and j
                        best_route[i:j+1] = reversed(best_route[i:j+1])
                        improved = True
                        break

                if improved:
                    break

        return best_route


    def simulated_annealing_tsp(self, distance_matrix, initial_route, initial_temp=100,
                                cooling_rate=0.995, iterations=1000):
        """
        Simulated Annealing for single-day route optimization
        """
        def calculate_route_time(route):
            return sum(
                distance_matrix.get(route[i], {}).get(route[i+1], float('inf'))
                for i in range(len(route) - 1)
            )

        def swap_random(route):
            new_route = route[:]
            if len(new_route) > 3:
                i, j = random.sample(range(1, len(new_route) - 1), 2)
                new_route[i], new_route[j] = new_route[j], new_route[i]
            return new_route

        current_route = initial_route[:]
        current_cost = calculate_route_time(current_route)

        best_route = current_route[:]
        best_cost = current_cost

        temperature = initial_temp

        for _ in range(iterations):
            neighbor_route = swap_random(current_route)
            neighbor_cost = calculate_route_time(neighbor_route)

            delta = neighbor_cost - current_cost

            if delta < 0 or random.random() < math.exp(-delta / temperature):
                current_route = neighbor_route
                current_cost = neighbor_cost

                if current_cost < best_cost:
                    best_route = current_route[:]
                    best_cost = current_cost

            temperature *= cooling_rate

        return best_route, best_cost


    # ============================================================================
    # STEP 5: MULTI-DAY SOLUTION BUILDER
    # ============================================================================

    def build_multi_day_solution(self, hotels, attractions, day_hotels, daily_assignments,
                                distance_matrix, visit_durations, daily_hours,
                                optimization_method='nearest_neighbor'):
        """
        Build complete multi-day solution

        Returns:
            daily_routes: Dict mapping day -> route
            daily_metrics: Dict mapping day -> metrics
            total_metrics: Overall metrics
        """
        total_days = len(daily_hours)
        daily_routes = {}
        daily_metrics = {}

        for day in range(total_days):
            hotel = day_hotels[day]
            hotel_id = hotel['id']
            attractions_today = daily_assignments.get(day, [])

            print(f"\nDay {day + 1}: Hotel {hotel['name'][:30]}, {len(attractions_today)} attractions")

            if not attractions_today:
                # No attractions, just stay at hotel
                daily_routes[day] = [hotel_id, hotel_id]
                daily_metrics[day] = {
                    'travel_time': 0,
                    'visit_time': 0,
                    'total_time': 0,
                    'available_time': daily_hours[day],
                    'slack_time': daily_hours[day],
                    'feasible': True
                }
                continue

            # Optimize single-day route
            if optimization_method == 'nearest_neighbor':
                route, travel_time = self.nearest_neighbor_tsp(distance_matrix, hotel_id, attractions_today)
                # Apply 2-opt improvement
                route = self.two_opt_improvement(route, distance_matrix)
                travel_time = sum(
                    distance_matrix.get(route[i], {}).get(route[i+1], 0)
                    for i in range(len(route) - 1)
                )

            elif optimization_method == 'simulated_annealing':
                # Start with nearest neighbor
                init_route, _ = self.nearest_neighbor_tsp(distance_matrix, hotel_id, attractions_today)
                route, travel_time = self.simulated_annealing_tsp(distance_matrix, init_route)

            else:  # Default to nearest neighbor
                route, travel_time = self.nearest_neighbor_tsp(distance_matrix, hotel_id, attractions_today)

            # Calculate metrics
            visit_time = sum(visit_durations.get(attr_id, 0) for attr_id in attractions_today)
            total_time = travel_time + visit_time

            daily_routes[day] = route
            daily_metrics[day] = {
                'travel_time': travel_time,
                'visit_time': visit_time,
                'total_time': total_time,
                'available_time': daily_hours[day],
                'slack_time': daily_hours[day] - total_time,
                'feasible': total_time <= daily_hours[day]
            }

            print(f"  Route: {' -> '.join([r[:10] for r in route])}")
            print(f"  Travel: {travel_time:.2f}h, Visit: {visit_time:.2f}h, Total: {total_time:.2f}h / {daily_hours[day]:.2f}h")
            print(f"  Feasible: {daily_metrics[day]['feasible']}")

        # Calculate total metrics
        total_metrics = {
            'total_travel_time': sum(m['travel_time'] for m in daily_metrics.values()),
            'total_visit_time': sum(m['visit_time'] for m in daily_metrics.values()),
            'total_time': sum(m['total_time'] for m in daily_metrics.values()),
            'total_available_time': sum(daily_hours),
            'all_days_feasible': all(m['feasible'] for m in daily_metrics.values())
        }

        return daily_routes, daily_metrics, total_metrics
    

    def solve_multi_day_route_optimization(self):
        """
        Main function to solve multi-day route optimization
        """
        print("="*70)
        print("MULTI-DAY TOURISM ROUTE OPTIMIZATION")
        print("="*70)

        # Step 1: Parse data
        print("\n[1/7] Parsing input data...")
        hotels, attractions, schedule, daily_hours = self.parsing_data()
        day_hotels = self.assign_hotels_to_days(hotels)

        print(f"  Total days: {schedule['total_days']}")
        print(f"  Hotels: {len(hotels)}")
        print(f"  Attractions: {len(attractions)}")
        print(f"  Daily hours: {[f'{h:.1f}h' for h in daily_hours]}")

        # Step 2: Prepare location data
        print("\n[2/7] Preparing location data...")
        all_locations = {}
        visit_durations = {}

        for hotel in hotels:
            all_locations[hotel['id']] = hotel['coords']
            visit_durations[hotel['id']] = 0

        for attr in attractions:
            all_locations[attr['id']] = attr['coords']
            visit_durations[attr['id']] = attr['duration']

        print(f"  Total locations: {len(all_locations)}")

        # Step 3: Download road network
        print("\n[3/7] Downloading road network...")
        G = self.get_road_network()
        print(f"  Network: {len(G.nodes)} nodes, {len(G.edges)} edges")

        # Step 4: Find nearest nodes
        print("\n[4/7] Finding nearest road nodes...")
        nearest_nodes = self.find_nearest_node(G, all_locations)

        # Step 5: Calculate distance matrix
        print("\n[5/7] Calculating distance matrix...")
        distance_matrix, path_matrix = self.compute_matrices(
            G, nearest_nodes, all_locations, avg_speed_kmh=40
        )

        # Step 6: Cluster attractions by days
        print("\n[6/7] Assigning attractions to days...")
        daily_assignments = self.cluster_attractions_by_days(
            attractions, hotels, day_hotels, distance_matrix, daily_hours
        )

        print("  Initial assignment:")
        for day, attrs in daily_assignments.items():
            print(f"    Day {day + 1}: {len(attrs)} attractions")

        # Balance workload
        daily_assignments = self.balance_daily_workload(
            attractions, daily_assignments, daily_hours, visit_durations
        )

        print("  Balanced assignment:")
        for day, attrs in daily_assignments.items():
            print(f"    Day {day + 1}: {len(attrs)} attractions")

        # Step 7: Optimize routes
        print("\n[7/7] Optimizing routes...")

        results = {}

        # Method 1: Nearest Neighbor + 2-Opt
        print("\n--- Method 1: Nearest Neighbor + 2-Opt ---")
        daily_routes_nn, daily_metrics_nn, total_metrics_nn = self.build_multi_day_solution(
            hotels, attractions, day_hotels, daily_assignments,
            distance_matrix, visit_durations, daily_hours,
            optimization_method='nearest_neighbor'
        )
        results['Nearest Neighbor + 2-Opt'] = {
            'daily_routes': daily_routes_nn,
            'daily_metrics': daily_metrics_nn,
            'total_metrics': total_metrics_nn
        }

        # Method 2: Simulated Annealing
        print("\n--- Method 2: Simulated Annealing ---")
        daily_routes_sa, daily_metrics_sa, total_metrics_sa = self.build_multi_day_solution(
            hotels, attractions, day_hotels, daily_assignments,
            distance_matrix, visit_durations, daily_hours,
            optimization_method='simulated_annealing'
        )
        results['Simulated Annealing'] = {
            'daily_routes': daily_routes_sa,
            'daily_metrics': daily_metrics_sa,
            'total_metrics': total_metrics_sa
        }

        # Print comparison
        print("\n" + "="*70)
        print("RESULTS COMPARISON")
        print("="*70)

        for method, result in results.items():
            tm = result['total_metrics']
            print(f"\n{method}:")
            print(f"  Total Travel Time: {tm['total_travel_time']:.2f} hours")
            print(f"  Total Visit Time: {tm['total_visit_time']:.2f} hours")
            print(f"  Total Time: {tm['total_time']:.2f} hours")
            print(f"  Available Time: {tm['total_available_time']:.2f} hours")
            print(f"  All Days Feasible: {tm['all_days_feasible']}")

        # Find best solution
        best_method = min(results.items(),
                        key=lambda x: x[1]['total_metrics']['total_time'])

        print(f"\n{'='*70}")
        print(f"BEST SOLUTION: {best_method[0]}")
        print(f"{'='*70}")

        # Get optimize Route
        optimized_routes = self.get_route_optimization_results(results, distance_matrix, day_hotels, all_locations, path_matrix, best_method)
        optimized_gantt_chart = self.get_optimized_gantt_chart(results, schedule, day_hotels, all_locations, visit_durations, best_method)
    

        return results, distance_matrix, day_hotels, all_locations, optimized_routes, optimized_gantt_chart
    
    def get_route_optimization_results(self, results, distance_matrix, day_hotels, all_locations, path_matrix, best_method):
        # results, G, distance_matrix, day_hotels, all_locations, path_matrix = self.solve_multi_day_route_optimization()
        G = self.graph
        # 1️⃣ Extract best solution
        best_solution = results[best_method[0]]
        daily_routes = best_solution['daily_routes']

        # 2️⃣ Collect all route + hotel + stop details
        route_details = []
        for day, route in daily_routes.items():
            day_info = {
                "day": day + 1,
                "color": None,
                "hotel": None,
                "stops": [],
                "path_lines": []
            }

            # --- Get hotel info ---
            if day in day_hotels:
                hotel = day_hotels[day]
                hotel_coords = all_locations[hotel['id']]
                day_info["hotel"] = {
                    "id": hotel["id"],
                    "name": hotel["name"],
                    "coordinates": {"lat": hotel_coords[0], "lon": hotel_coords[1]}
                }

            # --- Build routes (segments) ---
            route_coords = []
            for i in range(len(route) - 1):
                start_id, end_id = route[i], route[i + 1]

                if start_id in path_matrix and end_id in path_matrix[start_id]:
                    path_nodes = path_matrix[start_id][end_id]
                    if path_nodes:
                        segment_coords = [
                            {"lat": G.nodes[node]['y'], "lon": G.nodes[node]['x']}
                            for node in path_nodes
                        ]
                        route_coords.extend(segment_coords)

            if route_coords:
                day_info["path_lines"].append(route_coords)

            # --- Add attraction/stops ---
            for i, location_id in enumerate(route[1:-1], 1):
                if location_id in all_locations:
                    coords = all_locations[location_id]
                    day_info["stops"].append({
                        "id": location_id,
                        "stop_number": i,
                        "coordinates": {"lat": coords[0], "lon": coords[1]},
                    })

            route_details.append(day_info)

        # 3️⃣ Combine into response
        response = {
            "summary": {
                "total_days": len(daily_routes),
                "total_locations": len(all_locations),
                "total_hotels": len(day_hotels),
            },
            "routes": route_details
        }
        return response
    
    def get_optimized_gantt_chart(self, results, schedule, day_hotels, all_locations, visit_durations, best_method):
        
        best_solution = results[best_method[0]]
        daily_routes = best_solution['daily_routes']

        gantt_data = []
        start_value = schedule['start_date']
        if isinstance(start_value, datetime):
            start_date = start_value
        else:
            start_date = datetime.strptime(str(start_value), "%Y-%m-%d")


        for day, route in daily_routes.items():
            current_date = start_date + timedelta(days=day)
            current_time = current_date.replace(hour=8, minute=0)

            hotel = day_hotels[day]

            for i, location_id in enumerate(route):
                if i == 0:
                    activity_name = f"Start at {hotel['name'][:20]}"
                    duration = 0.5
                    activity_type = "Hotel"
                elif i == len(route) - 1:
                    activity_name = f"Return to {hotel['name'][:20]}"
                    duration = 0
                    activity_type = "Hotel"
                else:
                    activity_name = f"Visit {location_id}"
                    duration = visit_durations.get(location_id, 1)
                    activity_type = "Attraction"

                if duration > 0:
                    end_time = current_time + timedelta(hours=duration)
                    gantt_data.append({
                        "day": day + 1,
                        "activity": activity_name,
                        "type": activity_type,
                        "start": current_time.strftime("%Y-%m-%d %H:%M"),
                        "finish": end_time.strftime("%Y-%m-%d %H:%M"),
                        "duration_hours": duration,
                        "location_id": location_id,
                        "coordinates": all_locations.get(location_id, None)
                    })
                    current_time = end_time

                # Travel to next location
                if i < len(route) - 1:
                    next_location = route[i + 1]
                    travel_time = 0.5
                    travel_end = current_time + timedelta(hours=travel_time)

                    gantt_data.append({
                        "day": day + 1,
                        "activity": f"Travel to {next_location[:15]}",
                        "type": "Travel",
                        "start": current_time.strftime("%Y-%m-%d %H:%M"),
                        "finish": travel_end.strftime("%Y-%m-%d %H:%M"),
                        "duration_hours": travel_time,
                        "location_id": f"Travel-{next_location}",
                        "coordinates": all_locations.get(next_location, None)
                    })
                    current_time = travel_end

        # Group data for easier frontend rendering
        gantt_summary = {}
        for item in gantt_data:
            day = f"Day {item['day']}"
            if day not in gantt_summary:
                gantt_summary[day] = []
            gantt_summary[day].append(item)

        # Build response JSON
        response = {
            "method": 'Nearest Neighbor + 2-Opt',
            "total_days": len(daily_routes),
            "schedule_start": schedule["start_date"],
            "schedule_end": schedule["end_date"],
            "gantt_data": gantt_summary
        }

        return response 

    def get_route_json_response(self):
        """
        Convert optimized route results into JSON-ready response structure.
        """

        """
        Main function to solve multi-day route optimization
        """
        print("="*70)
        print("MULTI-DAY TOURISM ROUTE OPTIMIZATION")
        print("="*70)

        # Step 1: Parse data
        print("\n[1/7] Parsing input data...")
        hotels, attractions, schedule, daily_hours = self.parsing_data()
        day_hotels = self.assign_hotels_to_days(hotels)

        print(f"  Total days: {schedule['total_days']}")
        print(f"  Hotels: {len(hotels)}")
        print(f"  Attractions: {len(attractions)}")
        print(f"  Daily hours: {[f'{h:.1f}h' for h in daily_hours]}")

        # Step 2: Prepare location data
        print("\n[2/7] Preparing location data...")
        all_locations = {}
        visit_durations = {}

        for hotel in hotels:
            all_locations[hotel['id']] = hotel['coords']
            visit_durations[hotel['id']] = 0

        for attr in attractions:
            all_locations[attr['id']] = attr['coords']
            visit_durations[attr['id']] = attr['duration']

        print(f"  Total locations: {len(all_locations)}")

        # Step 3: Download road network
        print("\n[3/7] Downloading road network...")
        G = self.get_road_network()
        print(f"  Network: {len(G.nodes)} nodes, {len(G.edges)} edges")

        # Step 4: Find nearest nodes
        print("\n[4/7] Finding nearest road nodes...")
        nearest_nodes = self.find_nearest_node(G, all_locations)

        # Step 5: Calculate distance matrix
        print("\n[5/7] Calculating distance matrix...")
        distance_matrix, path_matrix = self.compute_matrices(
            G, nearest_nodes, all_locations, avg_speed_kmh=40
        )

         # Step 6: Cluster attractions by days
        print("\n[6/7] Assigning attractions to days...")
        daily_assignments = self.cluster_attractions_by_days(
            attractions, hotels, day_hotels, distance_matrix, daily_hours
        )

        print("  Initial assignment:")
        for day, attrs in daily_assignments.items():
            print(f"    Day {day + 1}: {len(attrs)} attractions")

        # Balance workload
        daily_assignments = self.balance_daily_workload(
            attractions, daily_assignments, daily_hours, visit_durations
        )

        print("  Balanced assignment:")
        for day, attrs in daily_assignments.items():
            print(f"    Day {day + 1}: {len(attrs)} attractions")

        # Step 7: Optimize routes
        print("\n[7/7] Optimizing routes...")

        results = {}

        # Method 1: Nearest Neighbor + 2-Opt
        print("\n--- Method 1: Nearest Neighbor + 2-Opt ---")
        daily_routes_nn, daily_metrics_nn, total_metrics_nn = self.build_multi_day_solution(
            hotels, attractions, day_hotels, daily_assignments,
            distance_matrix, visit_durations, daily_hours,
            optimization_method='nearest_neighbor'
        )
        results['Nearest Neighbor + 2-Opt'] = {
            'daily_routes': daily_routes_nn,
            'daily_metrics': daily_metrics_nn,
            'total_metrics': total_metrics_nn
        }

        # 1️⃣ Extract best solution
        best_solution = results['Nearest Neighbor + 2-Opt']
        daily_routes = best_solution['daily_routes']

        # 2️⃣ Collect all route + hotel + stop details
        route_details = []
        for day, route in daily_routes.items():
            day_info = {
                "day": day + 1,
                "color": None,
                "hotel": None,
                "stops": [],
                "path_lines": []
            }

            # --- Get hotel info ---
            if day in day_hotels:
                hotel = day_hotels[day]
                hotel_coords = all_locations[hotel['id']]
                day_info["hotel"] = {
                    "id": hotel["id"],
                    "name": hotel["name"],
                    "coordinates": {"lat": hotel_coords[0], "lon": hotel_coords[1]}
                }

            # --- Build routes (segments) ---
            route_coords = []
            for i in range(len(route) - 1):
                start_id, end_id = route[i], route[i + 1]

                if start_id in path_matrix and end_id in path_matrix[start_id]:
                    path_nodes = path_matrix[start_id][end_id]
                    if path_nodes:
                        segment_coords = [
                            {"lat": G.nodes[node]['y'], "lon": G.nodes[node]['x']}
                            for node in path_nodes
                        ]
                        route_coords.extend(segment_coords)

            if route_coords:
                day_info["path_lines"].append(route_coords)

            # --- Add attraction/stops ---
            for i, location_id in enumerate(route[1:-1], 1):
                if location_id in all_locations:
                    coords = all_locations[location_id]
                    day_info["stops"].append({
                        "id": location_id,
                        "stop_number": i,
                        "coordinates": {"lat": coords[0], "lon": coords[1]},
                    })

            route_details.append(day_info)

        # 3️⃣ Combine into response
        response = {
            "summary": {
                "total_days": len(daily_routes),
                "total_locations": len(all_locations),
                "total_hotels": len(day_hotels),
            },
            "routes": route_details
        }

        return response
    
    from django.http import JsonResponse
    import pandas as pd
    from datetime import timedelta, datetime

    def create_gantt_json(self):
        """
        Create Gantt chart schedule data (JSON version) for API response.
        """
        print("="*70)
        print("MULTI-DAY TOURISM ROUTE OPTIMIZATION")
        print("="*70)

        # Step 1: Parse data
        print("\n[1/7] Parsing input data...")
        hotels, attractions, schedule, daily_hours = self.parsing_data()
        day_hotels = self.assign_hotels_to_days(hotels)

        print(f"  Total days: {schedule['total_days']}")
        print(f"  Hotels: {len(hotels)}")
        print(f"  Attractions: {len(attractions)}")
        print(f"  Daily hours: {[f'{h:.1f}h' for h in daily_hours]}")

        # Step 2: Prepare location data
        print("\n[2/7] Preparing location data...")
        all_locations = {}
        visit_durations = {}

        for hotel in hotels:
            all_locations[hotel['id']] = hotel['coords']
            visit_durations[hotel['id']] = 0

        for attr in attractions:
            all_locations[attr['id']] = attr['coords']
            visit_durations[attr['id']] = attr['duration']

        print(f"  Total locations: {len(all_locations)}")

        # Step 3: Download road network
        print("\n[3/7] Downloading road network...")
        G = self.get_road_network()
        print(f"  Network: {len(G.nodes)} nodes, {len(G.edges)} edges")

        # Step 4: Find nearest nodes
        print("\n[4/7] Finding nearest road nodes...")
        nearest_nodes = self.find_nearest_node(G, all_locations)

        # Step 5: Calculate distance matrix
        print("\n[5/7] Calculating distance matrix...")
        distance_matrix, path_matrix = self.compute_matrices(
            G, nearest_nodes, all_locations, avg_speed_kmh=40
        )

         # Step 6: Cluster attractions by days
        print("\n[6/7] Assigning attractions to days...")
        daily_assignments = self.cluster_attractions_by_days(
            attractions, hotels, day_hotels, distance_matrix, daily_hours
        )

        print("  Initial assignment:")
        for day, attrs in daily_assignments.items():
            print(f"    Day {day + 1}: {len(attrs)} attractions")

        # Balance workload
        daily_assignments = self.balance_daily_workload(
            attractions, daily_assignments, daily_hours, visit_durations
        )

        print("  Balanced assignment:")
        for day, attrs in daily_assignments.items():
            print(f"    Day {day + 1}: {len(attrs)} attractions")

        # Step 7: Optimize routes
        print("\n[7/7] Optimizing routes...")

        results = {}

        # Method 1: Nearest Neighbor + 2-Opt
        print("\n--- Method 1: Nearest Neighbor + 2-Opt ---")
        daily_routes_nn, daily_metrics_nn, total_metrics_nn = self.build_multi_day_solution(
            hotels, attractions, day_hotels, daily_assignments,
            distance_matrix, visit_durations, daily_hours,
            optimization_method='nearest_neighbor'
        )
        results['Nearest Neighbor + 2-Opt'] = {
            'daily_routes': daily_routes_nn,
            'daily_metrics': daily_metrics_nn,
            'total_metrics': total_metrics_nn
        }
        
        best_solution = results['Nearest Neighbor + 2-Opt']
        daily_routes = best_solution['daily_routes']

        gantt_data = []
        start_value = schedule['start_date']
        if isinstance(start_value, datetime):
            start_date = start_value
        else:
            start_date = datetime.strptime(str(start_value), "%Y-%m-%d")


        for day, route in daily_routes.items():
            current_date = start_date + timedelta(days=day)
            current_time = current_date.replace(hour=8, minute=0)

            hotel = day_hotels[day]

            for i, location_id in enumerate(route):
                if i == 0:
                    activity_name = f"Start at {hotel['name'][:20]}"
                    duration = 0.5
                    activity_type = "Hotel"
                elif i == len(route) - 1:
                    activity_name = f"Return to {hotel['name'][:20]}"
                    duration = 0
                    activity_type = "Hotel"
                else:
                    activity_name = f"Visit {location_id}"
                    duration = visit_durations.get(location_id, 1)
                    activity_type = "Attraction"

                if duration > 0:
                    end_time = current_time + timedelta(hours=duration)
                    gantt_data.append({
                        "day": day + 1,
                        "activity": activity_name,
                        "type": activity_type,
                        "start": current_time.strftime("%Y-%m-%d %H:%M"),
                        "finish": end_time.strftime("%Y-%m-%d %H:%M"),
                        "duration_hours": duration,
                        "location_id": location_id,
                        "coordinates": all_locations.get(location_id, None)
                    })
                    current_time = end_time

                # Travel to next location
                if i < len(route) - 1:
                    next_location = route[i + 1]
                    travel_time = 0.5
                    travel_end = current_time + timedelta(hours=travel_time)

                    gantt_data.append({
                        "day": day + 1,
                        "activity": f"Travel to {next_location[:15]}",
                        "type": "Travel",
                        "start": current_time.strftime("%Y-%m-%d %H:%M"),
                        "finish": travel_end.strftime("%Y-%m-%d %H:%M"),
                        "duration_hours": travel_time,
                        "location_id": f"Travel-{next_location}",
                        "coordinates": all_locations.get(next_location, None)
                    })
                    current_time = travel_end

        # Group data for easier frontend rendering
        gantt_summary = {}
        for item in gantt_data:
            day = f"Day {item['day']}"
            if day not in gantt_summary:
                gantt_summary[day] = []
            gantt_summary[day].append(item)

        # Build response JSON
        response = {
            "method": 'Nearest Neighbor + 2-Opt',
            "total_days": len(daily_routes),
            "schedule_start": schedule["start_date"],
            "schedule_end": schedule["end_date"],
            "gantt_data": gantt_summary
        }

        return response

