"use client";

import TaskCard from "@/components/tasks/task-card";

export default function TaskPage() {
  return (
    <main className="container mx-auto px-4 py-8">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Tasks Dashboard
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Complete tasks to earn points
        </p>
      </div>

      <div className="flex justify-center">
        <div className="w-full max-w-4xl">
          <TaskCard />
        </div>
      </div>
    </main>
  );
}
