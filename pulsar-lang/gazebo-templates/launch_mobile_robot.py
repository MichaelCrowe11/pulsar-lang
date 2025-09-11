#!/usr/bin/env python3
"""
Pulsar Mobile Robot Gazebo Launch Script
Real-time robotics simulation with ROS 2 integration
"""

import os
import yaml
from launch import LaunchDescription
from launch.actions import DeclareLaunchArgument, ExecuteProcess, IncludeLaunchDescription
from launch.conditions import IfCondition
from launch.launch_description_sources import PythonLaunchDescriptionSource
from launch.substitutions import LaunchConfiguration, PathJoinSubstitution
from launch_ros.actions import Node
from launch_ros.substitutions import FindPackageShare

def generate_launch_description():
    # Launch arguments
    use_sim_time_arg = DeclareLaunchArgument(
        'use_sim_time',
        default_value='true',
        description='Use simulation time'
    )
    
    world_arg = DeclareLaunchArgument(
        'world',
        default_value='mobile_robot.world',
        description='Gazebo world file'
    )
    
    real_time_arg = DeclareLaunchArgument(
        'real_time',
        default_value='true',
        description='Enable real-time constraints'
    )
    
    control_frequency_arg = DeclareLaunchArgument(
        'control_frequency',
        default_value='100.0',
        description='Control loop frequency in Hz'
    )
    
    max_latency_arg = DeclareLaunchArgument(
        'max_latency_us',
        default_value='10000',
        description='Maximum allowed latency in microseconds'
    )
    
    # Gazebo server
    gazebo_server = ExecuteProcess(
        cmd=[
            'gzserver',
            '--verbose',
            '-s', 'libgazebo_ros_factory.so',
            '-s', 'libgazebo_ros_init.so',
            LaunchConfiguration('world')
        ],
        output='screen'
    )
    
    # Gazebo client
    gazebo_client = ExecuteProcess(
        cmd=['gzclient'],
        output='screen',
        condition=IfCondition(LaunchConfiguration('gui', default='true'))
    )
    
    # Robot state publisher
    robot_state_publisher = Node(
        package='robot_state_publisher',
        executable='robot_state_publisher',
        name='robot_state_publisher',
        parameters=[{
            'use_sim_time': LaunchConfiguration('use_sim_time'),
            'publish_frequency': LaunchConfiguration('control_frequency')
        }],
        remappings=[
            ('/tf', 'tf'),
            ('/tf_static', 'tf_static'),
        ]
    )
    
    # Joint state publisher
    joint_state_publisher = Node(
        package='joint_state_publisher',
        executable='joint_state_publisher',
        name='joint_state_publisher',
        parameters=[{
            'use_sim_time': LaunchConfiguration('use_sim_time'),
            'rate': LaunchConfiguration('control_frequency')
        }]
    )
    
    # Pulsar real-time navigation controller
    pulsar_nav_controller = Node(
        package='pulsar_nav',
        executable='rt_navigation_controller',
        name='pulsar_navigation',
        parameters=[{
            'use_sim_time': LaunchConfiguration('use_sim_time'),
            'control_frequency': LaunchConfiguration('control_frequency'),
            'max_latency_us': LaunchConfiguration('max_latency_us'),
            'real_time_enabled': LaunchConfiguration('real_time'),
            'scheduler_policy': 'EDF',  # or 'RM'
            'task_wcet_us': 5000,      # 5ms WCET
            'task_period_us': 10000,   # 10ms period
            'task_deadline_us': 8000,  # 8ms deadline
        }],
        output='screen'
    )
    
    # Sensor fusion node with EKF
    sensor_fusion = Node(
        package='pulsar_fusion',
        executable='rt_sensor_fusion',
        name='sensor_fusion',
        parameters=[{
            'use_sim_time': LaunchConfiguration('use_sim_time'),
            'filter_type': 'EKF',  # or 'UKF'
            'update_rate': 100.0,
            'max_update_time_us': 2000,
            'sensors': ['imu', 'odom', 'gps'],
            'state_dim': 6,  # [x, y, z, vx, vy, vz]
        }],
        remappings=[
            ('imu', '/imu'),
            ('odom', '/odom'),
            ('pose', '/robot_pose'),
        ],
        output='screen'
    )
    
    # Trajectory planner
    trajectory_planner = Node(
        package='pulsar_trajectory',
        executable='rt_trajectory_planner',
        name='trajectory_planner',
        parameters=[{
            'use_sim_time': LaunchConfiguration('use_sim_time'),
            'planner_type': 'time_optimal',
            'max_vel': [2.0, 2.0, 1.0],  # [linear_x, linear_y, angular_z]
            'max_acc': [1.0, 1.0, 0.5],
            'planning_frequency': 10.0,
            'max_planning_time_us': 50000,  # 50ms
        }],
        remappings=[
            ('goal', '/move_base_simple/goal'),
            ('trajectory', '/trajectory'),
        ],
        output='screen'
    )
    
    # Safety monitor
    safety_monitor = Node(
        package='pulsar_safety',
        executable='rt_safety_monitor',
        name='safety_monitor',
        parameters=[{
            'use_sim_time': LaunchConfiguration('use_sim_time'),
            'monitor_frequency': 1000.0,  # 1kHz safety monitoring
            'emergency_stop_topic': '/emergency_stop',
            'proximity_topics': ['/scan'],
            'min_obstacle_distance': 0.3,
            'max_velocity': 2.0,
            'safety_certified': True,
        }],
        output='screen'
    )
    
    # RViz visualization
    rviz = Node(
        package='rviz2',
        executable='rviz2',
        name='rviz2',
        arguments=['-d', PathJoinSubstitution([
            FindPackageShare('pulsar_gazebo'),
            'rviz',
            'mobile_robot.rviz'
        ])],
        condition=IfCondition(LaunchConfiguration('rviz', default='true'))
    )
    
    # Performance monitor
    performance_monitor = Node(
        package='pulsar_monitor',
        executable='rt_performance_monitor',
        name='performance_monitor',
        parameters=[{
            'use_sim_time': LaunchConfiguration('use_sim_time'),
            'monitoring_topics': [
                '/pulsar_navigation/timing',
                '/sensor_fusion/timing',
                '/trajectory_planner/timing',
                '/safety_monitor/timing'
            ],
            'max_latency_us': LaunchConfiguration('max_latency_us'),
            'log_violations': True,
            'shutdown_on_violation': False,
        }],
        output='screen'
    )
    
    return LaunchDescription([
        # Arguments
        use_sim_time_arg,
        world_arg,
        real_time_arg,
        control_frequency_arg,
        max_latency_arg,
        
        # Gazebo
        gazebo_server,
        gazebo_client,
        
        # Robot description
        robot_state_publisher,
        joint_state_publisher,
        
        # Pulsar real-time nodes
        pulsar_nav_controller,
        sensor_fusion,
        trajectory_planner,
        safety_monitor,
        
        # Visualization and monitoring
        rviz,
        performance_monitor,
    ])