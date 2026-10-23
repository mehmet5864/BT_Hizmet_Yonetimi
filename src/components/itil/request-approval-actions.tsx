"use client";

import { ApproveRejectForm } from "@/components/itil/approve-reject-form";

const reload = () => window.location.reload();

export function RequestApprovalActions({ id }: { id: string }) {
  return (
    <ApproveRejectForm
      id={id}
      kind="request"
      size="default"
      approveLabel="Onayla — işlem açıkta devam eder"
      rejectLabel="Reddet"
      onDone={reload}
    />
  );
}
