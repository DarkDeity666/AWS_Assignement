# Screenshot and final report checklist

Only capture each practical stage after it works. Keep originals locally; send redacted copies in the chat. A screenshot of a creation form proves intent, not successful configuration. Keep resource names, useful status labels, timestamps/time ranges, and the selected region visible when relevant.

| Filename | Exactly what should be visible | What it demonstrates |
|---|---|---|
| `01-account-plan.png` | Account plan/Free Tier view and benefits status; redact account details. | Account readiness and eligibility check. |
| `01b-credits.png` (if needed) | Available credits/expiry when shown on another page. | Credit awareness, not a guarantee of zero charges. |
| `02-budget.png` | Saved `student-portal-budget`, threshold/type and configured alert. | Budget notification exists, not an automatic cost cap. |
| `03-github.png` | Repository URL, project folders, README and latest commit. | Source code published to GitHub. |
| `04-portal-overview.png` | Overview, calculated cards and browser-demo badge. | Prototype interface. |
| `05-student-directory.png` | A fictional added/edited student and directory search/filter. | Local record management. |
| `06-attendance.png` | Selected date, saved attendance values and totals. | Local attendance feature. |
| `07-ec2.png` | Lab instance state and passing status checks. | Running EC2 instance. |
| `08-ec2-app.png` | App loaded at the EC2 host URL in the address bar. | App files hosted on EC2. |
| `09-alb-targets.png` | Target group name and healthy EC2 targets. | ALB health checks have healthy targets. |
| `10-alb-app.png` | App loaded through the ALB DNS name. | App served through the load balancer. |
| `11-autoscaling.png` | Group name, min/desired/max and scaling policy target. | Configured capacity and policy. |
| `12-scaling-activity.png` (if tested) | Activity history with time and cause of an actual capacity change. | Actual scaling event. Label a manual capacity change as manual. |
| `13-cloudwatch.png` | CPU metric, instance ID/label and time range; alarm state if configured. | Monitoring; app logs require separate configuration. |
| `14-cloudtrail.png` | A lab management event's name, time, source and identity type; redact private identifiers. | Auditing of the actual AWS management operation. |
| `15-rds.png` (if built) | RDS instance availability + relevant schema/query result. | Relational database provisioning/data. |
| `16-dynamodb.png` (if built) | Table key schema and fictional attendance item. | NoSQL table and data. |
| `17-database-integration.png` (if built) | App change matched to database record, plus fresh-session read. | Actual app-to-database integration, only after adding a backend. |
| `18-pipeline.png` (if built) | Complete successful pipeline, source commit and deploy stage. | Verified automated release. |
| `19-deployed-change.png` (if built) | Visible version/content change at the deployed URL after the release. | Release reached the application. |
| `20-cloudformation.png` (if built) | Stack completed state and its template/resources. | Infrastructure deployed from code. |
| `21-cleanup.png` | Lab resources deleted/terminated and no lab ASG replacing them. | Cleanup; review other chargeable resources too. |

Do not fabricate successful statuses or screenshot captions. A design screenshot should say **Proposed architecture**. Database-resource screenshots should say **Provisioned separately** until integration is verified. GitHub Actions checks are not CodePipeline runs. The 1,000-to-10,000-user scenario is conceptual unless a genuine load test is performed.

## Final PDF outline

1. Title, student/group details supplied by you, and activity objective.
2. University portal scenario and implementation scope.
3. Nine-row service-selection table.
4. Labeled proposed AWS architecture.
5. Five conceptual answers.
6. Traffic-increase case study answers.
7. Prototype screenshots and GitHub repository link.
8. Completed AWS practical stages with numbered screenshots and factual captions.
9. Limitations, cleanup record, and official references.

The PDF will be created after you upload the screenshots. This project does not include a report falsely showing work that has not happened.
