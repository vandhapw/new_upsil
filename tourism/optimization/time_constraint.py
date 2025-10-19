import json
import pandas as pd
import numpy as np
import random
import time
import folium
from typing import List, Tuple, Dict, Optional
from datetime import datetime, timedelta, time as dt_time
import warnings
warnings.filterwarnings('ignore')

# ===============================
# Enhanced Time Management for N-Days
# ===============================

class NDayTimeScheduler:
    """Handle time scheduling and constraints for N-day tourism."""
    
    def __init__(self):
        # Time constraints
        self.breakfast_start = dt_time(7, 0)
        self.breakfast_end = dt_time(10, 0)
        self.attraction_start = dt_time(8, 0)
        self.attraction_end = dt_time(20, 0)
        
        # Activity durations (in minutes)
        self.breakfast_duration = 60
        self.attraction_visit_duration = 90
        self.travel_time_buffer = 15
        
        # Color palette for multiple days
        self.day_colors = [
            'red', 'blue', 'green', 'purple', 'orange', 'darkred', 'lightred',
            'beige', 'darkblue', 'darkgreen', 'cadetblue', 'darkpurple', 'pink',
            'gray', 'lightblue', 'lightgreen', 'black'
        ]
    
    def get_day_color(self, day_index: int) -> str:
        """Get color for a specific day."""
        return self.day_colors[day_index % len(self.day_colors)]
    
    def calculate_travel_time(self, distance_meters: float, speed_kmh: float = 50) -> int:
        """Calculate travel time in minutes."""
        distance_km = distance_meters / 1000
        travel_hours = distance_km / speed_kmh
        return max(int(travel_hours * 60), 5)
    
    def get_earliest_departure_time(self, day_type: str = "normal") -> dt_time:
        """Get earliest departure time after breakfast."""
        return dt_time(8, 0)
    
    def is_within_attraction_hours(self, current_time: dt_time, visit_duration: int = 90) -> bool:
        """Check if attraction visit fits within operating hours."""
        end_time_minutes = current_time.hour * 60 + current_time.minute + visit_duration
        end_hours = end_time_minutes // 60
        return end_hours < 20 or (end_hours == 20 and end_time_minutes % 60 == 0)
    
    def calculate_route_schedule(self, route: List[int], distance_matrix: np.ndarray, 
                               all_locations: List[Dict]) -> Dict:
        """Calculate detailed time schedule for a route."""
        schedule = {
            'timeline': [],
            'total_duration_minutes': 0,
            'feasible': True,
            'constraint_violations': []
        }
        
        current_time = self.get_earliest_departure_time("breakfast_included")
        total_minutes = 0
        
        for i in range(len(route) - 1):
            from_idx = route[i]
            to_idx = route[i + 1]
            from_location = all_locations[from_idx]['name']
            to_location = all_locations[to_idx]['name']
            
            # Calculate travel time
            distance = distance_matrix[from_idx][to_idx]
            travel_minutes = self.calculate_travel_time(distance)
            
            # Travel to destination
            travel_end_minutes = current_time.hour * 60 + current_time.minute + travel_minutes
            travel_end_hours = min(travel_end_minutes // 60, 23)
            travel_end_minutes = travel_end_minutes % 60
            arrival_time = dt_time(travel_end_hours, travel_end_minutes)
            
            # Check if returning to hotel (end of day)
            if i == len(route) - 2:
                schedule['timeline'].append({
                    'activity': 'Return to Hotel',
                    'from': from_location,
                    'to': to_location,
                    'start_time': current_time,
                    'end_time': arrival_time,
                    'duration_minutes': travel_minutes,
                    'distance_meters': distance,
                    'type': 'travel'
                })
                total_minutes += travel_minutes
                break
            
            # For attractions
            if i > 0:
                # Check timing constraints
                if not self.is_within_attraction_hours(arrival_time, self.attraction_visit_duration):
                    schedule['feasible'] = False
                    schedule['constraint_violations'].append(
                        f"Attraction {to_location} visit would exceed operating hours (20:00)"
                    )
                
                # Calculate visit end time
                visit_end_minutes = arrival_time.hour * 60 + arrival_time.minute + self.attraction_visit_duration
                visit_end_hours = min(visit_end_minutes // 60, 23)
                visit_end_minutes = visit_end_minutes % 60
                visit_end_time = dt_time(visit_end_hours, visit_end_minutes)
                
                # Add timeline entries
                schedule['timeline'].extend([
                    {
                        'activity': 'Travel',
                        'from': from_location,
                        'to': to_location,
                        'start_time': current_time,
                        'end_time': arrival_time,
                        'duration_minutes': travel_minutes,
                        'distance_meters': distance,
                        'type': 'travel'
                    },
                    {
                        'activity': 'Visit Attraction',
                        'location': to_location,
                        'start_time': arrival_time,
                        'end_time': visit_end_time,
                        'duration_minutes': self.attraction_visit_duration,
                        'type': 'visit'
                    }
                ])
                
                current_time = visit_end_time
                total_minutes += travel_minutes + self.attraction_visit_duration
            else:
                # First travel from hotel
                schedule['timeline'].append({
                    'activity': 'Start Journey',
                    'from': from_location,
                    'to': to_location,
                    'start_time': current_time,
                    'end_time': arrival_time,
                    'duration_minutes': travel_minutes,
                    'distance_meters': distance,
                    'type': 'travel'
                })
                current_time = arrival_time
                total_minutes += travel_minutes
        
        schedule['total_duration_minutes'] = total_minutes
        schedule['end_time'] = current_time
        
        return schedule