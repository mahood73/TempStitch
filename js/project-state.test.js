import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { createProjectStore } from './project-state.js';

describe('Project store', () => {
    it('installs a Project only after it is presented successfully', () => {
        const firstProject = Object.freeze({ id: 'first' });
        const replacementProject = Object.freeze({ id: 'replacement' });
        const failedProject = Object.freeze({ id: 'failed' });
        const presented = [];
        let presentationFails = false;
        const store = createProjectStore((project) => {
            if (presentationFails) throw new Error('Presentation failed');
            presented.push(project);
        });

        assert.equal(store.getProject(), null);
        assert.strictEqual(store.commit(firstProject), firstProject);
        assert.strictEqual(store.getProject(), firstProject);
        assert.deepEqual(presented, [firstProject]);

        assert.strictEqual(store.commit(replacementProject), replacementProject);
        assert.strictEqual(store.getProject(), replacementProject);
        assert.deepEqual(presented, [firstProject, replacementProject]);

        presentationFails = true;
        assert.throws(() => store.commit(failedProject), /Presentation failed/);
        assert.strictEqual(store.getProject(), replacementProject);
        assert.deepEqual(presented, [firstProject, replacementProject]);
    });
});
