const ReportingService = require('../../services/reportingService');
const UserProgress = require('../../models/userProgress');
const Assessment = require('../../models/assessment');
const TaskStatus = require('../../models/taskStatus');
const ChecklistItem = require('../../models/checklistItem');

// Mock Slack app
const mockSlackApp = {
  client: {
    chat: {
      postMessage: jest.fn().mockResolvedValue({ ok: true }),
    },
    users: {
      info: jest.fn().mockResolvedValue({
        ok: true,
        user: {
          profile: {
            real_name: 'Test User',
            email: 'test@example.com',
          },
        },
      }),
    },
  },
};

describe('ReportingService', () => {
  let reportingService;

  beforeEach(() => {
    reportingService = new ReportingService(mockSlackApp);
  });

  describe('generateManagerReport', () => {
    test('should return message for no new hires', async () => {
      const result = await reportingService.generateManagerReport('U1234567890', new Date());

      expect(result.managerId).toBe('U1234567890');
      expect(result.summary.totalNewHires).toBe(0);
      expect(result.summary.message).toBe('No new hires found for this manager');
    });

    test('should generate report for manager with new hires', async () => {
      // Create test data
      const taskStatus = new TaskStatus({
        userId: 'U1234567890',
        weekIndex: 0,
        dayIndex: 1,
        taskIndex: 0,
        completed: true,
      });
      await taskStatus.save();

      const result = await reportingService.generateManagerReport('U1234567890', new Date());

      expect(result.managerId).toBe('U1234567890');
      expect(result.newHires).toBeDefined();
      expect(result.summary).toBeDefined();
      expect(result.recommendations).toBeDefined();
    });
  });

  describe('getNewHiresForManager', () => {
    test('should return empty array when no new hires', async () => {
      const newHires = await reportingService.getNewHiresForManager('U1234567890');

      expect(newHires).toEqual([]);
    });

    test('should return new hires from last 30 days', async () => {
      // Create a recent task status
      const taskStatus = new TaskStatus({
        userId: 'U1234567890',
        weekIndex: 0,
        dayIndex: 1,
        taskIndex: 0,
        completed: true,
        createdAt: new Date(),
      });
      await taskStatus.save();

      const newHires = await reportingService.getNewHiresForManager('U1234567890');

      expect(newHires).toHaveLength(1);
      expect(newHires[0].userId).toBe('U1234567890');
    });
  });

  describe('generateNewHireReport', () => {
    test('should generate comprehensive new hire report', async () => {
      const newHire = {
        userId: 'U1234567890',
        userName: 'Test User',
        email: 'test@example.com',
        function: 'Engineering',
        subFunction: 'Backend',
        startDate: new Date(),
      };

      // Create test data
      const taskStatus = new TaskStatus({
        userId: 'U1234567890',
        weekIndex: 0,
        dayIndex: 1,
        taskIndex: 0,
        completed: true,
      });
      await taskStatus.save();

      const checklistItem = new ChecklistItem({
        userId: 'U1234567890',
        task: 'Test Checklist Item',
        completed: true,
      });
      await checklistItem.save();

      const assessment = new Assessment({
        userId: 'U1234567890',
        taskTitle: 'Fintech 101',
        weekIndex: 0,
        dayIndex: 1,
        taskIndex: 0,
        googleFormUrl: 'https://forms.gle/test',
        status: 'completed',
        score: 85,
        passed: true,
      });
      await assessment.save();

      const report = await reportingService.generateNewHireReport(newHire, new Date());

      expect(report.userId).toBe('U1234567890');
      expect(report.progress.overallPercentage).toBeDefined();
      expect(report.progress.tasksCompleted).toBe(1);
      expect(report.progress.totalTasks).toBe(1);
      expect(report.assessments).toHaveLength(1);
      expect(report.assessments[0].taskTitle).toBe('Fintech 101');
      expect(report.assessments[0].score).toBe(85);
      expect(report.milestones).toBeDefined();
      expect(report.concerns).toBeDefined();
    });
  });

  describe('generateRecentActivity', () => {
    test('should generate recent activity for user', async () => {
      const userId = 'U1234567890';
      const reportDate = new Date();

      // Create recent assessment
      const assessment = new Assessment({
        userId,
        taskTitle: 'Fintech 101',
        weekIndex: 0,
        dayIndex: 1,
        taskIndex: 0,
        googleFormUrl: 'https://forms.gle/test',
        status: 'completed',
        score: 85,
        passed: true,
        completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      });
      await assessment.save();

      // Create recent task
      const taskStatus = new TaskStatus({
        userId,
        weekIndex: 0,
        dayIndex: 1,
        taskIndex: 0,
        completed: true,
        updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      });
      await taskStatus.save();

      const activities = await reportingService.generateRecentActivity(userId, reportDate);

      expect(activities).toHaveLength(2);
      expect(activities[0].type).toBe('assessment_passed');
      expect(activities[0].description).toContain('Passed assessment');
      expect(activities[1].type).toBe('task_completed');
      expect(activities[1].description).toContain('Completed onboarding task');
    });
  });

  describe('generateMilestones', () => {
    test('should generate milestones for new hire', () => {
      const newHire = {
        startDate: new Date(),
      };
      const completedTasks = [{ title: 'Task 1' }, { title: 'Task 2' }, { title: 'Task 3' }, { title: 'Task 4' }, { title: 'Task 5' }];
      const completedChecklistItems = [];
      const completedAssessments = [{ taskTitle: 'Test Assessment', completedAt: new Date() }];

      const milestones = reportingService.generateMilestones(newHire, completedTasks, completedChecklistItems, completedAssessments);

      expect(milestones).toHaveLength(4);
      expect(milestones[0].name).toBe('First Week Complete');
      expect(milestones[0].achieved).toBe(true);
      expect(milestones[1].name).toBe('First Assessment Passed');
      expect(milestones[1].achieved).toBe(true);
    });
  });

  describe('generateConcerns', () => {
    test('should generate concerns for struggling new hire', () => {
      const newHire = {
        startDate: new Date(),
      };
      const assessments = [
        { status: 'failed' },
        { status: 'failed' },
        { status: 'completed', score: 60 },
      ];
      const taskStatuses = [];

      const concerns = reportingService.generateConcerns(newHire, assessments, taskStatuses, new Date());

      expect(concerns.length).toBeGreaterThanOrEqual(2);
      expect(concerns[0].type).toBe('multiple_failures');
      expect(concerns[1].type).toBe('low_performance');
    });

    test('should generate inactivity concern', () => {
      const newHire = {
        startDate: new Date(),
      };
      const assessments = [];
      const taskStatuses = []; // No recent activity

      const concerns = reportingService.generateConcerns(newHire, assessments, taskStatuses, new Date());

      expect(concerns).toHaveLength(1);
      expect(concerns[0].type).toBe('inactive');
    });
  });

  describe('calculateSummaryStats', () => {
    test('should calculate summary statistics', () => {
      const newHireReports = [
        {
          progress: { overallPercentage: 80 },
          assessments: [{ passed: true }, { passed: false }],
          concerns: [],
        },
        {
          progress: { overallPercentage: 60 },
          assessments: [{ passed: true }],
          concerns: [{ severity: 'high' }],
        },
        {
          progress: { overallPercentage: 90 },
          assessments: [{ passed: true }, { passed: true }],
          concerns: [],
        },
      ];

      const summary = reportingService.calculateSummaryStats(newHireReports);

      expect(summary.totalNewHires).toBe(3);
      expect(summary.averageProgress).toBe(77); // (80 + 60 + 90) / 3
      expect(summary.assessmentsPassed).toBe(4);
      expect(summary.assessmentsFailed).toBe(1);
      expect(summary.topPerformers.length).toBeGreaterThanOrEqual(1);
      expect(summary.needsAttention.length).toBeGreaterThanOrEqual(1);
      expect(summary.overallHealth).toBe('good');
    });
  });

  describe('generateRecommendations', () => {
    test('should generate recommendations based on data', () => {
      const newHireReports = [
        {
          progress: { overallPercentage: 30 },
          concerns: [{ severity: 'high' }],
        },
        {
          progress: { averageScore: 60 },
        },
        {
          progress: { overallPercentage: 95, averageScore: 90 },
        },
      ];

      const recommendations = reportingService.generateRecommendations(newHireReports);

      expect(recommendations.length).toBeGreaterThanOrEqual(1);
      expect(recommendations[0].type).toBeDefined();
      expect(recommendations[0].priority).toBeDefined();
    });
  });

  describe('sendManagerReport', () => {
    test('should send manager report via Slack', async () => {
      const report = {
        _id: new require('mongoose').Types.ObjectId(),
        managerId: 'U1234567890',
        reportDate: new Date(),
        summary: {
          totalNewHires: 5,
          averageProgress: 80,
          assessmentsPassed: 10,
          assessmentsFailed: 2,
          overallHealth: 'good',
        },
        newHires: [
          {
            userName: 'Test User',
            progress: { overallProgress: 80 },
            assessments: [],
            concerns: [],
          },
        ],
        recommendations: [],
      };

      const result = await reportingService.sendManagerReport('U1234567890', report);

      expect(result).toBe(true);
      expect(mockSlackApp.client.chat.postMessage).toHaveBeenCalledWith({
        token: process.env.SLACK_BOT_TOKEN,
        channel: 'U1234567890',
        text: expect.stringContaining('Weekly Onboarding Report'),
        blocks: expect.any(Array),
      });
    });
  });

  describe('formatReportAsSlackBlocks', () => {
    test('should format report as Slack blocks', () => {
      const report = {
        reportDate: new Date(),
        period: {
          startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          endDate: new Date(),
        },
        summary: {
          totalNewHires: 5,
          averageProgress: 80,
          assessmentsPassed: 10,
          assessmentsFailed: 2,
          overallHealth: 'good',
          topPerformers: ['U1', 'U2'],
          needsAttention: ['U3'],
        },
        newHires: [
          {
            userName: 'Test User',
            function: 'Engineering',
            progress: { overallProgress: 80 },
            assessments: [{ passed: true }],
            concerns: [],
          },
        ],
        recommendations: [
          {
            type: 'intervention_needed',
            description: 'User needs help',
            priority: 'high',
            targetUsers: ['U3'],
          },
        ],
      };

      const blocks = reportingService.formatReportAsSlackBlocks(report);

      expect(blocks.length).toBeGreaterThanOrEqual(8); // Header + sections
      expect(blocks[0].type).toBe('header');
      expect(blocks[1].type).toBe('section');
      expect(blocks[2].type).toBe('divider');
    });
  });

  describe('createProgressBar', () => {
    test('should create progress bar', () => {
      const progressBar = reportingService.createProgressBar(75);

      expect(progressBar).toContain('█');
      expect(progressBar).toContain('░');
      expect(progressBar).toHaveLength(10);
    });

    test('should handle edge cases', () => {
      expect(reportingService.createProgressBar(0)).toBe('░░░░░░░░░░');
      expect(reportingService.createProgressBar(100)).toBe('██████████');
      expect(reportingService.createProgressBar(50)).toBe('█████░░░░░');
    });
  });
});
