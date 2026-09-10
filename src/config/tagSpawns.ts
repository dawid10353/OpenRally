import type { TagSpawnPoint } from '@/types/level';

/**
 * 12 Pre-computed, verified safe static spawn points for Rally Tag mode across all 5 levels.
 * Guaranteed: zero prop collisions, safe ground elevation, spaced along course.
 */
export const TAG_LEVEL_SPAWNS: Record<string, readonly TagSpawnPoint[]> = {
  "level1_island": [
    {
      "position": [
        0,
        8.75,
        0
      ],
      "rotationY": 1.7459
    },
    {
      "position": [
        223.98,
        13.2,
        -128.56
      ],
      "rotationY": 2.1273
    },
    {
      "position": [
        428.53,
        19.78,
        -148.74
      ],
      "rotationY": 0.394
    },
    {
      "position": [
        380.28,
        0.59,
        62.19
      ],
      "rotationY": 0.8844
    },
    {
      "position": [
        312.12,
        21.97,
        251.88
      ],
      "rotationY": -0.9474
    },
    {
      "position": [
        84.58,
        14.39,
        374.47
      ],
      "rotationY": -1.2005
    },
    {
      "position": [
        -155.64,
        16.04,
        378.15
      ],
      "rotationY": -2.2167
    },
    {
      "position": [
        -338.73,
        5.95,
        196.97
      ],
      "rotationY": -2.52
    },
    {
      "position": [
        -431.97,
        -1.03,
        -33.31
      ],
      "rotationY": 2.7838
    },
    {
      "position": [
        -286.78,
        11.24,
        -229.36
      ],
      "rotationY": -2.4862
    },
    {
      "position": [
        -214.26,
        12.69,
        -366.53
      ],
      "rotationY": 1.3381
    },
    {
      "position": [
        -158.68,
        15.48,
        -179.6
      ],
      "rotationY": -0.2411
    }
  ],
  "level2_desert": [
    {
      "position": [
        0,
        8.75,
        0
      ],
      "rotationY": 1.1906
    },
    {
      "position": [
        233.24,
        5.33,
        90.8
      ],
      "rotationY": 1.116
    },
    {
      "position": [
        432.49,
        20.16,
        238.05
      ],
      "rotationY": 0.6673
    },
    {
      "position": [
        365.19,
        41.42,
        432.82
      ],
      "rotationY": -1.05
    },
    {
      "position": [
        127.48,
        3.7,
        437.32
      ],
      "rotationY": -2.0146
    },
    {
      "position": [
        -108.38,
        5.29,
        442.13
      ],
      "rotationY": -1.8746
    },
    {
      "position": [
        -308.35,
        14.1,
        296.75
      ],
      "rotationY": -2.4409
    },
    {
      "position": [
        -436.57,
        41.57,
        82.86
      ],
      "rotationY": -2.7246
    },
    {
      "position": [
        -396.47,
        18.97,
        -131.69
      ],
      "rotationY": 2.299
    },
    {
      "position": [
        -407.41,
        38.52,
        -338.81
      ],
      "rotationY": 2.3684
    },
    {
      "position": [
        -179.97,
        16.43,
        -375.2
      ],
      "rotationY": 1.083
    },
    {
      "position": [
        -181.84,
        8.9,
        -164.7
      ],
      "rotationY": 0.8103
    }
  ],
  "level3_sweden": [
    {
      "position": [
        0,
        8.75,
        0
      ],
      "rotationY": 1.6225
    },
    {
      "position": [
        242.49,
        18.3,
        -101.08
      ],
      "rotationY": 2.0336
    },
    {
      "position": [
        451.46,
        43.26,
        -110.45
      ],
      "rotationY": 0.4355
    },
    {
      "position": [
        428.33,
        24.14,
        120.42
      ],
      "rotationY": 0.5301
    },
    {
      "position": [
        290.47,
        21.56,
        314.53
      ],
      "rotationY": -1.0874
    },
    {
      "position": [
        51.73,
        0.04,
        425.39
      ],
      "rotationY": -1.1802
    },
    {
      "position": [
        -193.42,
        11.46,
        387.78
      ],
      "rotationY": -2.1533
    },
    {
      "position": [
        -373.08,
        24.17,
        197.03
      ],
      "rotationY": -2.558
    },
    {
      "position": [
        -443.48,
        37.83,
        -41.6
      ],
      "rotationY": 2.6662
    },
    {
      "position": [
        -330.44,
        41.63,
        -249.97
      ],
      "rotationY": -2.396
    },
    {
      "position": [
        -213.4,
        49.76,
        -382.3
      ],
      "rotationY": 1.2732
    },
    {
      "position": [
        -170.39,
        20.79,
        -183.05
      ],
      "rotationY": -0.0997
    }
  ],
  "level4_britain": [
    {
      "position": [
        0,
        9.25,
        0
      ],
      "rotationY": 1.1079
    },
    {
      "position": [
        180.18,
        11.88,
        166.95
      ],
      "rotationY": -0.5623
    },
    {
      "position": [
        273,
        32.03,
        358.87
      ],
      "rotationY": 1.0506
    },
    {
      "position": [
        366.44,
        8.69,
        556.28
      ],
      "rotationY": 0.856
    },
    {
      "position": [
        548.82,
        9.35,
        710.84
      ],
      "rotationY": -0.6499
    },
    {
      "position": [
        318.26,
        7.16,
        621.11
      ],
      "rotationY": -2.2103
    },
    {
      "position": [
        109.57,
        21.06,
        600.53
      ],
      "rotationY": -2.735
    },
    {
      "position": [
        -22.62,
        18.9,
        365.4
      ],
      "rotationY": -1.3914
    },
    {
      "position": [
        -266.48,
        18.15,
        451.28
      ],
      "rotationY": -2.2912
    },
    {
      "position": [
        -349.2,
        9.06,
        206.46
      ],
      "rotationY": -2.4168
    },
    {
      "position": [
        -458.18,
        3.08,
        -23.05
      ],
      "rotationY": 2.6467
    },
    {
      "position": [
        -231.81,
        2.19,
        -159.26
      ],
      "rotationY": 1.2186
    }
  ],
  "level5_gymkhana": [
    {
      "position": [
        0,
        8.75,
        0
      ],
      "rotationY": 0.3798
    },
    {
      "position": [
        47.48,
        8.75,
        104.54
      ],
      "rotationY": 0.6555
    },
    {
      "position": [
        144.51,
        8.75,
        145.34
      ],
      "rotationY": 1.9375
    },
    {
      "position": [
        192.82,
        8.75,
        50.51
      ],
      "rotationY": -3.1055
    },
    {
      "position": [
        160.88,
        8.75,
        -59.73
      ],
      "rotationY": -2.6662
    },
    {
      "position": [
        95.91,
        8.75,
        -154.98
      ],
      "rotationY": -2.3032
    },
    {
      "position": [
        -7.94,
        8.75,
        -199.6
      ],
      "rotationY": -1.4722
    },
    {
      "position": [
        -104.79,
        8.75,
        -141.96
      ],
      "rotationY": -0.5771
    },
    {
      "position": [
        -156.45,
        8.75,
        -38.29
      ],
      "rotationY": -0.4695
    },
    {
      "position": [
        -208.8,
        8.75,
        64.95
      ],
      "rotationY": -0.271
    },
    {
      "position": [
        -142.12,
        8.75,
        134.74
      ],
      "rotationY": 2.0852
    },
    {
      "position": [
        -58.55,
        8.75,
        54.98
      ],
      "rotationY": 2.4812
    }
  ]
};
