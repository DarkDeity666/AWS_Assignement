# AWS practical guide — one stage at a time

You are using your **own AWS account**. The worksheet itself does not require cloud resources. The practical extension below will be guided interactively, based on your actual console and account. Only Stage 1 is ready to carry out now; the remaining rows are a roadmap and evidence plan, not completed deployments.

## Stage 1 — Account, region, and cost visibility

1. Sign in to your existing [AWS Console](https://console.aws.amazon.com/). Use your normal administrative identity. Keep root for account-level tasks and secure it with MFA; do not create access keys for this prototype.
2. In the region selector, choose **Asia Pacific (Mumbai), ap-south-1**, unless your instructor requires a different region. Keep the same region for the practical stages. Billing is global and may not show that region selector.
3. Open **Billing and Cost Management**. Check your account plan, **Free Tier** eligibility/usage, **Credits**, and current charges. AWS benefits depend on the account and plan. Do not assume every service or instance marked “eligible” is free; do not upgrade a plan just for this activity.
4. Open **Budgets → Create budget → Use a template (simplified) → Zero spend budget**. Name it `student-portal-budget`. Enter an email you monitor and create the budget. If the console differs, use the linked official instructions or share the screen before choosing another budget type.
5. Open the created budget and verify the alert is configured. A budget is an alert, **not a spending cap**, and billing/notifications can be delayed. It will not automatically terminate instances or stop a running ALB or database.
6. Capture the two screenshots below, then return to the chat. We will move on after checking them. Do not launch EC2, ALB, RDS, or Redshift yet.

**Capture now:**

- `01-account-plan.png`: Billing / Free Tier or account-plan view showing the plan and remaining benefits/credits, if shown. If credits are on a separate page, add `01b-credits.png`.
- `02-budget.png`: Budget details showing `student-portal-budget`, its zero-spend configuration/threshold, and that an email alert is configured. Hide the full email if desired.

Crop or redact your account ID, email, payment details, and unrelated account information. Keep the relevant labels and budget configuration visible. Never include passwords, MFA codes, or access keys. Tell the chat which region you selected. If a page says “Access denied,” share that message; do not grant broad new permissions merely to get a screenshot.

Official guidance: [budget templates](https://docs.aws.amazon.com/cost-management/latest/userguide/budget-templates.html), [creating a budget](https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-create.html), and [AWS Free Tier](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/free-tier.html). Reviewed 6 October 2026; your console and eligibility remain authoritative.

## Remaining stages — roadmap only

| Stage | Work to guide in the chat | Evidence / completion check |
|---|---|---|
| 2 — GitHub and local demo | Publish this project to your chosen GitHub repository; demonstrate student and attendance features. | Repository root + README; app screenshots. |
| 3 — EC2 hosting | Estimate costs, choose the account-eligible instance, configure a restricted web server, and deploy `public/`. | Instance running/status checks and app at its AWS URL. Browser data still stays local. |
| 4 — ALB and Auto Scaling | Prepare a repeatable launch template; target group; ALB across two AZs; scaling policy and bounded capacity. New instances must serve the same app. | Healthy targets, app through ALB DNS, group bounds/policy, scaling activity if actually tested. |
| 5 — Monitoring and auditing | Inspect CloudWatch EC2 CPU metrics and ALB metrics; configure a useful alarm if needed. Use CloudTrail Event history for actual management actions. | CPU graph with instance/time range, alarm, event detail. |
| 6 — Data layer decision | Decide whether to keep RDS/DynamoDB as proposed design or extend with a small backend API. Only provision paid resources when the demonstration needs them. | If built: DB/table state and a real app-to-database read/write test. Empty resources prove provisioning only. |
| 7 — Delivery and IaC | Configure a GitHub connection and CodePipeline deployment path; capture a real release. Define chosen resources in CloudFormation if doing an IaC demonstration. | Successful complete pipeline + visible app update; stack/template evidence if deployed. |
| 8 — Cleanup and report | Remove resources created for the lab; inspect leftovers and costs; assemble uploaded screenshots into the final PDF. | Cleanup evidence, final deployment-status table, assignment answers and report. |

### Decisions reserved for the appropriate stage

- Check actual regional prices before launching resources. EC2, EBS, public IPv4, ALB, RDS, logs, pipelines, artifacts, and data transfer may incur charges. No fixed price or free deployment is promised here.
- For ALB, use healthy instances in the required subnets/AZs and a security group that permits the intended application path. A launch template must reproduce the installed web files on replacement/scaled instances; manually copying files to only one instance is insufficient.
- AWS hosting alone does not give the app a shared database. A genuine data demonstration requires adding a server API, suitable IAM permissions, private database connectivity, and verification using a fresh browser/session. Do not enter AWS credentials into this frontend.
- Redshift answers the analytics selection requirement. There is no need to provision a warehouse for twelve fictional students.
- The native CodePipeline EC2 deploy action requires Linux instances managed by SSM and is supported in V2 pipelines. The exact delivery design will be chosen at Stage 7; a source-only pipeline is not a deployment.
- Existing CloudTrail Event history is sufficient to show recent management activity. Creating a paid event store is unnecessary for that evidence.

## Cleanup plan to keep alongside the lab

Maintain an inventory as resources are created. After screenshots are captured, remove only resources created for this activity. First disable release triggers/scaling as appropriate and set the lab Auto Scaling group's desired/minimum capacity to zero before deleting it; otherwise it may replace terminated instances. Remove the lab ALB/listeners/target group, standalone EC2 instances, unneeded EBS volumes and allocated addresses, and the lab launch template. For any RDS instance, decide whether a final snapshot is needed and account for retained snapshots. Remove lab DynamoDB tables, pipelines/artifact objects, custom log groups/alarms, and stacks if created. CloudFormation-managed resources should normally be cleaned up by deleting their stack, then checking retained resources. Do not delete unrelated account resources.

Simply stopping EC2 is not full cleanup: other resources can keep charging. Recheck Bills after usage updates. Keep the budget alert.
